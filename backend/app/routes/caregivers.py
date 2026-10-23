"""Caregiver self-service. Identity documents never enter profile responses."""
import json
import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import CaregiverProfile, User
from app.services.cloudinary_service import (
    delete_national_id, delete_profile_photo, upload_national_id,
    upload_profile_photo, validate_image,
)
from app.utils.auth import role_required

caregivers_bp = Blueprint("caregivers", __name__)
ALLOWED_SERVICE_CATEGORIES = {
    "nanny", "babysitter", "travel_nanny", "occasional_babysitter",
    "breastfeeding_support", "overnight_sleep_training", "special_needs_nanny",
    "newborn_maternity_nanny", "early_years_educator", "other",
}
ALLOWED_SERVICE_TYPES = {
    "live_in", "live_out", "part_time", "occasional_backup",
    "emergency_short_notice", "travel", "overnight", "weekend_holiday",
    "evening", "event", "other",
    "breastfeeding_support", "overnight_sleep_training", "special_needs_care",
    "newborn_maternity_care",
}
DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
PROFILE_FIELDS = (
    "id", "name", "photo_url", "service_category", "service_types",
    "other_service_description", "bio", "location", "years_experience",
    "expected_pay_min", "expected_pay_max", "pay_period", "availability",
    "skills", "verification_status",
)


def serialize_profile(profile, owner=False):
    result = {field: getattr(profile, field) for field in PROFILE_FIELDS}
    if owner:
        result["phone"] = profile.user.phone
        result["national_id_uploaded"] = bool(profile.id_document_public_id)
    return result


def parse_service_types(raw_value):
    try:
        value = json.loads(raw_value)
    except (ValueError, TypeError):
        return None
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        return None
    return list(dict.fromkeys(item.strip().lower() for item in value if item.strip()))


def validate_fields(form, profile=None):
    """Validate the merged profile, including partial edits, before uploading files."""
    def current(field, default=None):
        return form[field] if field in form else getattr(profile, field, default)

    fields = {}
    for field, limit in [("name", 120), ("bio", 3000), ("location", 120),
                         ("other_service_description", 1000)]:
        value = (current(field) or "").strip()
        if len(value) > limit:
            raise ValueError(f"{field.replace('_', ' ').capitalize()} must be at most {limit} characters")
        fields[field] = value or None
    if not fields["name"]:
        raise ValueError("Name is required")
    category = (current("service_category", "") or "").strip().lower()
    if category not in ALLOWED_SERVICE_CATEGORIES:
        raise ValueError("Invalid service category")
    fields["service_category"] = category
    types = (parse_service_types(form["service_types"]) if "service_types" in form
             else getattr(profile, "service_types", None))
    if not types or any(item not in ALLOWED_SERVICE_TYPES for item in types):
        raise ValueError("Select at least one valid service type")
    fields["service_types"] = types
    if (category == "other" or "other" in types) and not fields["other_service_description"]:
        raise ValueError("Please describe the other caregiver service you provide")
    if "live_out" in types and not fields["location"]:
        raise ValueError("Location is required when offering live-out services")
    for field, default in [("years_experience", 0), ("expected_pay_min", None),
                           ("expected_pay_max", None)]:
        raw = current(field, default)
        try:
            value = int(raw) if raw not in (None, "") else default
        except (TypeError, ValueError):
            raise ValueError(f"{field.replace('_', ' ').capitalize()} must be a whole number") from None
        if value is not None and (value < 0 or value > 2147483647):
            raise ValueError(f"{field.replace('_', ' ').capitalize()} is out of range")
        fields[field] = value
    if (fields["expected_pay_min"] is not None and fields["expected_pay_max"] is not None
            and fields["expected_pay_min"] > fields["expected_pay_max"]):
        raise ValueError("Minimum expected pay cannot exceed maximum expected pay")
    fields["pay_period"] = (current("pay_period", "monthly") or "").strip().lower()
    if fields["pay_period"] not in {"monthly", "daily", "hourly"}:
        raise ValueError("Invalid pay period")
    for field in ("availability", "skills"):
        value = current(field)
        if field in form:
            try:
                value = json.loads(value) if value else []
            except (ValueError, TypeError):
                raise ValueError(f"{field.capitalize()} must be a JSON list") from None
        if value is not None:
            if not isinstance(value, list) or len(value) > 30 or not all(
                    isinstance(item, str) and 0 < len(item.strip()) <= 80 for item in value):
                raise ValueError(f"{field.capitalize()} must be a list of up to 30 short text values")
            value = list(dict.fromkeys(item.strip() for item in value))
            if field == "availability" and any(day not in DAYS for day in value):
                raise ValueError("Availability must contain valid weekdays")
        fields[field] = value
    return fields


def save_profile(profile=None):
    user = db.session.get(User, int(get_jwt_identity()))
    creating = profile is None
    try:
        fields = validate_fields(request.form, profile)
        phone = request.form.get("phone", user.phone or "").strip()
        if phone and not re.fullmatch(r"\+?[0-9][0-9 ()-]{6,30}", phone):
            raise ValueError("Enter a valid contact phone number")
        photo = request.files.get("photo")
        national_id = request.files.get("national_id")
        if creating and (not photo or not national_id):
            raise ValueError("Profile photo and National ID are required")
        if not creating and national_id:
            raise ValueError("National ID replacement requires administrator assistance")
        for file in (photo, national_id):
            if file and not validate_image(file):
                raise ValueError("Uploads must be JPEG, PNG, or WebP images, at most 5 MB each")
    except ValueError as error:
        return jsonify(error=str(error)), 400

    photo_upload = id_upload = None
    old_photo = profile.photo_public_id if profile else None
    try:
        if photo:
            photo_upload = upload_profile_photo(photo)
        if national_id:
            id_upload = upload_national_id(national_id)
    except Exception:
        if photo_upload:
            delete_profile_photo(photo_upload["public_id"])
        if id_upload:
            delete_national_id(id_upload["public_id"])
        return jsonify(error="Unable to upload documents. Please try again."), 502

    if creating:
        profile = CaregiverProfile(user_id=user.id, verification_status="unverified")
    for key, value in fields.items():
        setattr(profile, key, value)
    if photo_upload:
        profile.photo_url = photo_upload["url"]
        profile.photo_public_id = photo_upload["public_id"]
    if id_upload:
        profile.id_document_public_id = id_upload["public_id"]
    user.phone = phone or None
    try:
        db.session.add(profile)
        db.session.commit()
    except Exception as error:
        db.session.rollback()
        if photo_upload:
            delete_profile_photo(photo_upload["public_id"])
        if id_upload:
            delete_national_id(id_upload["public_id"])
        if isinstance(error, IntegrityError) and creating:
            return jsonify(error="Caregiver profile already exists"), 409
        return jsonify(error="Unable to save your profile. Please try again."), 500
    if photo_upload and old_photo and old_photo != photo_upload["public_id"]:
        delete_profile_photo(old_photo)
    return jsonify(
        message="Profile created successfully" if creating else "Profile updated successfully",
        profile=serialize_profile(profile, owner=True),
    ), 201 if creating else 200


@caregivers_bp.post("/profile")
@role_required("caregiver")
def create_profile():
    if CaregiverProfile.query.filter_by(user_id=int(get_jwt_identity())).first():
        return jsonify(error="Caregiver profile already exists"), 409
    return save_profile()


@caregivers_bp.get("/profile")
@role_required("caregiver")
def my_profile():
    profile = CaregiverProfile.query.filter_by(user_id=int(get_jwt_identity())).first()
    if profile is None:
        return jsonify(error="Create your caregiver profile to get started"), 404
    return jsonify(profile=serialize_profile(profile, owner=True))


@caregivers_bp.put("/profile")
@role_required("caregiver")
def update_my_profile():
    profile = CaregiverProfile.query.filter_by(user_id=int(get_jwt_identity())).first()
    if profile is None:
        return jsonify(error="Caregiver profile not found"), 404
    return save_profile(profile)


@caregivers_bp.get("/<int:profile_id>")
def public_profile(profile_id):
    profile = db.session.get(CaregiverProfile, profile_id)
    if profile is None:
        return jsonify(error="Caregiver profile not found"), 404
    return jsonify(profile=serialize_profile(profile))


@caregivers_bp.put("/<int:profile_id>")
@role_required("caregiver")
def update_profile(profile_id):
    profile = db.session.get(CaregiverProfile, profile_id)
    if profile is None:
        return jsonify(error="Caregiver profile not found"), 404
    if profile.user_id != int(get_jwt_identity()):
        return jsonify(error="You can only edit your own profile"), 403
    return save_profile(profile)
