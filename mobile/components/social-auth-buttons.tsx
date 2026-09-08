import { AppleSignInButton } from "@/components/apple-sign-in-button";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export function SocialAuthButtons({
  disabled,
  onMfa,
  onError,
  tone = "dark",
}: {
  disabled?: boolean;
  onMfa: (mfaToken: string, emailHint: string) => void;
  onError: (message: string) => void;
  tone?: "dark" | "light";
}) {
  return (
    <>
      <AppleSignInButton disabled={disabled} onError={onError} tone={tone} />
      <GoogleSignInButton
        disabled={disabled}
        onMfa={onMfa}
        onError={onError}
        tone={tone}
      />
    </>
  );
}
