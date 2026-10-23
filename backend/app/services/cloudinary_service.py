import cloudinary.uploader


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


def validate_image(file):
    if file is None:
        return False

    if not file.filename:
        return False

    if file.mimetype not in ALLOWED_IMAGE_TYPES:
        return False

    position = file.stream.tell()
    header = file.stream.read(12)
    file.stream.seek(0, 2)
    size = file.stream.tell()
    file.stream.seek(position)
    signatures = {
        "image/jpeg": header.startswith(b"\xff\xd8\xff"),
        "image/png": header.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": header.startswith(b"RIFF") and header[8:12] == b"WEBP",
    }
    if size > 5 * 1024 * 1024 or not signatures[file.mimetype]:
        return False

    return True


def upload_profile_photo(file):
    result = cloudinary.uploader.upload(
        file,
        resource_type="image",
        type="upload",
        folder="nanny-marketplace/caregivers/profile-photos",
    )

    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
    }


def upload_national_id(file):
    result = cloudinary.uploader.upload(
        file,
        resource_type="image",
        type="authenticated",
        folder="nanny-marketplace/caregivers/national-ids",
    )

    return {
        "public_id": result["public_id"],
    }


def delete_profile_photo(public_id):
    if not public_id:
        return

    try:
        cloudinary.uploader.destroy(
            public_id,
            resource_type="image",
            type="upload",
            invalidate=True,
        )
    except Exception:
        pass


def delete_national_id(public_id):
    if not public_id:
        return

    try:
        cloudinary.uploader.destroy(
            public_id,
            resource_type="image",
            type="authenticated",
            invalidate=True,
        )
    except Exception:
        pass
