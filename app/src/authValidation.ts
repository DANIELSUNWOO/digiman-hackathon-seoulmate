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
