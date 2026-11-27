export type AuthFieldErrors = {
  email?: "EMAIL_INVALID";
  password?: "PASSWORD_REQUIRED" | "PASSWORD_TOO_SHORT";
  confirm?: "CONFIRM_MISMATCH";
  agree?: "AGREE_REQUIRED";
};

export function validateCredentialFields(
  email: string,
  password: string,
  signup: boolean,
  confirm: string,
  agree: boolean,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "EMAIL_INVALID";
  }
  if (!password) {
    errors.password = "PASSWORD_REQUIRED";
  } else if (signup && password.length < 8) {
    errors.password = "PASSWORD_TOO_SHORT";
  }
  if (signup && password !== confirm) {
    errors.confirm = "CONFIRM_MISMATCH";
  }
  if (signup && !agree) {
    errors.agree = "AGREE_REQUIRED";
  }
  return errors;
}

export function validateCredentials(
  email: string,
  password: string,
  signup: boolean,
  confirm: string,
  agree: boolean,
): "credentials" | "signup" | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password)
    return "credentials";
  if (signup && (password.length < 8 || password !== confirm || !agree))
    return "signup";
  return null;
}
