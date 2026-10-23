from functools import wraps

from flask import jsonify
from flask_jwt_extended import (
    get_jwt_identity,
    verify_jwt_in_request,
)

from app.extensions import db
from app.models import User


def role_required(*allowed_roles):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()

            user_id = get_jwt_identity()

            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                return jsonify(
                    {
                        "error": "Invalid authentication identity"
                    }
                ), 401

            user = db.session.get(User, user_id)

            if user is None:
                return jsonify(
                    {
                        "error": "User not found"
                    }
                ), 401

            if user.role not in allowed_roles:
                return jsonify(
                    {
                        "error": "You do not have permission to access this resource"
                    }
                ), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator