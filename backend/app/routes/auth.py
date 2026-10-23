import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
)
from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

from app.extensions import db
from app.models import EmployerProfile, User
from app.utils.auth import role_required


auth_bp = Blueprint("auth", __name__)


def serialize_user(user):
    data = {
        "id": user.id,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "created_at": (
            user.created_at.isoformat()
            if user.created_at
            else None
        ),
    }

    if user.role == "caregiver":
        profile = user.caregiver_profile

        data["profile"] = {
            "exists": profile is not None,
            "id": profile.id if profile else None,
            "verification_status": (
                profile.verification_status
                if profile
                else None
            ),
        }

    elif user.role == "employer":
        profile = user.employer_profile

        data["profile"] = {
            "exists": profile is not None,
            "id": profile.id if profile else None,
        }

    return data


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    if not isinstance(data, dict) or any(
        not isinstance(data.get(field, ""), str)
        for field in ("email", "password", "role", "phone")
    ):
        return jsonify(error="Account fields must be text values"), 400

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    role = str(data.get("role", "")).strip().lower()
    phone = str(data.get("phone", "")).strip() or None

    if len(email) > 255 or len(password) > 128:
        return jsonify(error="Email or password is too long"), 400
    if phone and not re.fullmatch(r"\+?[0-9][0-9 ()-]{6,30}", phone):
        return jsonify(error="Enter a valid contact phone number"), 400

    if not email:
        return jsonify({
            "error": "Email is required"
        }), 400

    if not password:
        return jsonify({
            "error": "Password is required"
        }), 400

    if not role:
        return jsonify({
            "error": "Role is required"
        }), 400

    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({
            "error": "Enter a valid email address"
        }), 400

    # Public registration cannot create admins.
    if role not in {"caregiver", "employer"}:
        return jsonify({
            "error": "Role must be caregiver or employer"
        }), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters"
        }), 400

    existing_user = User.query.filter_by(
        email=email
    ).first()

    if existing_user:
        return jsonify({
            "error": "An account with this email already exists"
        }), 409

    user = User(
        email=email,
        phone=phone,
        role=role,
        password_hash=generate_password_hash(password),
    )

    try:
        db.session.add(user)
        db.session.flush()

        # Employer profile can be created immediately.
        if role == "employer":
            employer_profile = EmployerProfile(
                user_id=user.id
            )

            db.session.add(employer_profile)

        # Caregiver profile is created separately because
        # profile photo and National ID are compulsory.

        db.session.commit()

    except Exception:
        db.session.rollback()

        return jsonify({
            "error": "Unable to create account"
        }), 500

    return jsonify({
        "message": "Account created successfully",
        "user": serialize_user(user),
    }), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    if not isinstance(data, dict) or any(
        not isinstance(data.get(field, ""), str)
        for field in ("email", "password")
    ):
        return jsonify(error="Email and password must be text values"), 400

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    user = User.query.filter_by(
        email=email
    ).first()

    if user is None:
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    if not check_password_hash(
        user.password_hash,
        password,
    ):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
        },
    )

    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
        },
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": serialize_user(user),
    }), 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid authentication identity"
        }), 401

    user = db.session.get(
        User,
        user_id,
    )

    if user is None:
        return jsonify({
            "error": "User not found"
        }), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
        },
    )

    return jsonify({
        "access_token": access_token
    }), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid authentication identity"
        }), 401

    user = db.session.get(
        User,
        user_id,
    )

    if user is None:
        return jsonify({
            "error": "User not found"
        }), 404

    return jsonify({
        "user": serialize_user(user)
    }), 200


# Temporary authorization test routes

@auth_bp.get("/test/caregiver")
@role_required("caregiver")
def caregiver_test():
    return jsonify({
        "message": "Caregiver authorization successful"
    }), 200


@auth_bp.get("/test/employer")
@role_required("employer")
def employer_test():
    return jsonify({
        "message": "Employer authorization successful"
    }), 200


@auth_bp.get("/test/admin")
@role_required("admin")
def admin_test():
    return jsonify({
        "message": "Admin authorization successful"
    }), 200
