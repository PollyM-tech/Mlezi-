from datetime import datetime, timezone

from app.extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)

    role = db.Column(
        db.Enum(
            "caregiver",
            "employer",
            "admin",
            name="user_role",
        ),
        nullable=False,
    )

    email = db.Column(
        db.String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    phone = db.Column(
        db.String(32),
        nullable=True,
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    caregiver_profile = db.relationship(
        "CaregiverProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    employer_profile = db.relationship(
        "EmployerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class CaregiverProfile(db.Model):
    __tablename__ = "caregiver_profile"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    name = db.Column(
        db.String(120),
        nullable=False,
    )

    # Compulsory Cloudinary profile photo
    photo_url = db.Column(
        db.String(500),
        nullable=False,
    )

    photo_public_id = db.Column(
        db.String(255),
        nullable=False,
    )

    # Compulsory National ID stored privately in Cloudinary
    id_document_public_id = db.Column(
        db.String(255),
        nullable=False,
    )

    bio = db.Column(
        db.Text,
        nullable=True,
    )

    service_category = db.Column(
        db.String(64),
        nullable=False,
    )

    service_types = db.Column(
        db.JSON,
        nullable=False,
    )

    other_service_description = db.Column(
        db.Text,
        nullable=True,
    )

    location = db.Column(
        db.String(120),
        nullable=True,
        index=True,
    )

    years_experience = db.Column(
        db.Integer,
        default=0,
        nullable=False,
    )

    expected_pay_min = db.Column(
        db.Integer,
        nullable=True,
    )

    expected_pay_max = db.Column(
        db.Integer,
        nullable=True,
    )

    pay_period = db.Column(
        db.Enum(
            "monthly",
            "daily",
            "hourly",
            name="pay_period",
        ),
        default="monthly",
        nullable=False,
    )

    availability = db.Column(
        db.JSON,
        nullable=True,
    )

    skills = db.Column(
        db.JSON,
        nullable=True,
    )

    verification_status = db.Column(
        db.Enum(
            "unverified",
            "pending",
            "verified",
            "rejected",
            name="verification_status",
        ),
        default="unverified",
        nullable=False,
    )

    is_featured = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
    )

    featured_until = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
    )

    rating_avg = db.Column(
        db.Float,
        default=0,
        nullable=False,
    )

    review_count = db.Column(
        db.Integer,
        default=0,
        nullable=False,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )

    user = db.relationship(
        "User",
        back_populates="caregiver_profile",
    )


class EmployerProfile(db.Model):
    __tablename__ = "employer_profile"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    name = db.Column(
        db.String(120),
        nullable=True,
    )

    unlock_pass_active = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
    )

    unlock_pass_expires_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
    )

    user = db.relationship(
        "User",
        back_populates="employer_profile",
    )


class ContactUnlock(db.Model):
    __tablename__ = "contact_unlock"

    id = db.Column(db.Integer, primary_key=True)

    employer_id = db.Column(
        db.Integer,
        db.ForeignKey("employer_profile.id"),
        nullable=False,
        index=True,
    )

    caregiver_id = db.Column(
        db.Integer,
        db.ForeignKey("caregiver_profile.id"),
        nullable=False,
        index=True,
    )

    unlocked_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    __table_args__ = (
        db.UniqueConstraint(
            "employer_id",
            "caregiver_id",
            name="uq_contact_unlock",
        ),
    )


class Payment(db.Model):
    __tablename__ = "payment"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        index=True,
    )

    type = db.Column(
        db.Enum(
            "unlock_pass",
            "featured_boost",
            name="payment_type",
        ),
        nullable=False,
    )

    amount = db.Column(
        db.Integer,
        nullable=False,
    )

    status = db.Column(
        db.Enum(
            "pending",
            "completed",
            "failed",
            name="payment_status",
        ),
        default="pending",
        nullable=False,
    )

    mpesa_ref = db.Column(
        db.String(64),
        nullable=True,
        unique=True,
    )

    checkout_request_id = db.Column(
        db.String(128),
        nullable=True,
        unique=True,
        index=True,
    )

    merchant_request_id = db.Column(
        db.String(128),
        nullable=True,
    )

    phone = db.Column(
        db.String(32),
        nullable=True,
    )

    result_code = db.Column(
        db.Integer,
        nullable=True,
    )

    result_description = db.Column(
        db.String(255),
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )


class VerificationSubmission(db.Model):
    __tablename__ = "verification_submission"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    caregiver_id = db.Column(
        db.Integer,
        db.ForeignKey("caregiver_profile.id"),
        nullable=False,
        index=True,
    )

    # Certificate of Good Conduct / Police Clearance
    good_conduct_public_id = db.Column(
        db.String(255),
        nullable=False,
    )

    status = db.Column(
        db.Enum(
            "pending",
            "approved",
            "rejected",
            name="verification_submission_status",
        ),
        default="pending",
        nullable=False,
    )

    reviewed_by = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=True,
    )

    rejection_reason = db.Column(
        db.Text,
        nullable=True,
    )

    submitted_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    reviewed_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
    )


class Review(db.Model):
    __tablename__ = "review"

    id = db.Column(db.Integer, primary_key=True)

    from_user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        index=True,
    )

    to_user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        index=True,
    )

    rating = db.Column(
        db.Integer,
        nullable=False,
    )

    comment = db.Column(
        db.Text,
        nullable=True,
    )

    is_public = db.Column(
        db.Boolean,
        default=True,
        nullable=False,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    __table_args__ = (
        db.CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="ck_review_rating",
        ),
    )


class Report(db.Model):
    __tablename__ = "report"

    id = db.Column(db.Integer, primary_key=True)

    reporter_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        index=True,
    )

    reported_user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        index=True,
    )

    reason = db.Column(
        db.String(120),
        nullable=False,
    )

    details = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.Enum(
            "open",
            "reviewed",
            "resolved",
            name="report_status",
        ),
        default="open",
        nullable=False,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )


class Shortlist(db.Model):
    __tablename__ = "shortlist"

    id = db.Column(db.Integer, primary_key=True)

    employer_id = db.Column(
        db.Integer,
        db.ForeignKey("employer_profile.id"),
        nullable=False,
        index=True,
    )

    caregiver_id = db.Column(
        db.Integer,
        db.ForeignKey("caregiver_profile.id"),
        nullable=False,
        index=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    __table_args__ = (
        db.UniqueConstraint(
            "employer_id",
            "caregiver_id",
            name="uq_shortlist",
        ),
    )