export function errorMessage(error) {
  if (typeof error?.data === "string") return error.data;
  if (error?.data?.message) return error.data.message;
  const message = String(error?.message || "");
  if (/InvalidSecret|InvalidAccountId|Invalid credentials/i.test(message))
    return "The email or password is incorrect. Try an email code or reset your password.";
  if (/AccountAlreadyExists/.test(message))
    return "An account already exists. Sign in or reset your password.";
  if (/expired|verify code|Invalid code/i.test(message))
    return "That session, code or link has expired. Request a new one.";
  if (
    /^(Each image must be 5 MB|Please sign in again before uploading)/.test(
      message,
    )
  )
    return message;
  if (/network|fetch|connect/i.test(message))
    return "Unable to connect. Check your internet connection and try again.";
  return "Unable to complete this request. Please try again.";
}
export function codeFromLink(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "mlezicare:" ||
      url.hostname !== "auth" ||
      !["", "/"].includes(url.pathname) ||
      url.username ||
      url.password
    )
      return null;
    const code = url.searchParams.get("code");
    return code && code.length <= 2048 ? code : null;
  } catch {
    return null;
  }
}
export function newProfileFields(user) {
  return {
    name: "",
    phone: user?.phone || "",
    bio: "",
    service_category: "nanny",
    service_types: [],
    location: "",
    years_experience: "0",
    expected_pay_min: "",
    expected_pay_max: "",
    pay_period: "monthly",
    availability: [],
    skills: [],
    age_groups: [],
    languages: [],
    travel_scope: "local",
    travel_notes: "",
    other_service_description: "",
    is_available: true,
  };
}
export function validateProfile(fields, images, creating, consent) {
  if (!fields.name.trim() || !fields.phone.trim())
    return "Enter your name and contact phone.";
  if (!fields.service_types.length)
    return "Choose at least one work arrangement.";
  if (
    (fields.service_category === "other" ||
      fields.service_types.includes("other")) &&
    !fields.other_service_description.trim()
  )
    return "Describe the other service you offer.";
  if (creating && (!images.photo || !images.national_id || !images.selfie))
    return "Choose a profile photo, national ID image and recent selfie.";
  if (creating && !consent)
    return "Confirm permission for the identity comparison.";
  if (
    fields.expected_pay_min &&
    fields.expected_pay_max &&
    Number(fields.expected_pay_min) > Number(fields.expected_pay_max)
  )
    return "Minimum pay cannot exceed maximum pay.";
  return null;
}
export function secureStorageAdapter(store) {
  return {
    getItem: (key) => store.getItemAsync(key),
    setItem: (key, value) => store.setItemAsync(key, value),
    removeItem: (key) => store.deleteItemAsync(key),
  };
}
