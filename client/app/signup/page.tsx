"use client";

import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { signupFormData, signupSchema } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import google from "../../assets/google.svg";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LoadOlderMessages from "@/components/LoadOlderMessages";
import { Eye, EyeOff, Mail } from "lucide-react";
import Loading from "@/components/Loading";
import AuthShell from "@/components/AuthShell";

const SignupPage = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<signupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!sessionPending && session) {
      router.replace("/");
    }
  }, [session, sessionPending, router]);

  const handleSignup = async (data: signupFormData) => {
    setEmailLoading(true);

    const { error } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
      callbackURL: "/",
    });

    setEmailLoading(false);

    if (error) {
      toast.error(error.message || "Registration failed. Please check your details and try again.");
      return;
    }

    setSignupComplete(true);
  };

  const handleResendVerification = async () => {
    setResendLoading(true);

    const { error } = await authClient.sendVerificationEmail({
      email: getValues("email"),
      callbackURL: "/",
    });

    setResendLoading(false);

    if (error) {
      toast.error(error.message || "Failed to resend verification email. Please try again later.");
      return;
    }

    toast.success("Verification email sent");
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });

    setGoogleLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign up with Google. Please try again.");
    }
  };

  if (sessionPending) return <Loading />;

  return (
    <AuthShell>
      {signupComplete ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-brand-light">
            <Mail className="size-8 text-brand" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Check your email
          </h3>
          <p className="text-gray-500 text-sm leading-6 max-w-md">
            We sent a verification link to
          </p>
          <p className="font-medium text-gray-900 mt-1 break-all">
            {getValues("email")}
          </p>
          <p className="text-sm text-gray-500 max-w-sm mt-3">
            We sent a verification link to your email address.
            Click the link to verify your account and continue.
          </p>
          <div className="relative w-full mt-8 rounded-xl overflow-hidden">
            <Button
              type="button"
              variant="outline"
              onClick={handleResendVerification}
              className="w-full h-12 rounded-xl bg-white border-gray-200 text-gray-700 text-base font-medium hover:bg-gray-50"
            >
              Resend verification email
            </Button>
            {resendLoading && (
              <LoadOlderMessages isComponent={true} />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            You can close this page after receiving the email.
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-2xl font-bold text-gray-900">Create your account</h3>
          <p className="text-gray-500 text-sm mt-1 mb-8">Join E-Chat and start talking with your friends</p>

          <form
            onSubmit={handleSubmit(handleSignup)}
            className="space-y-2"
          >
            <Label className="text-gray-600">
              Name
            </Label>
            <Input
              {...register("name")}
              placeholder="Enter your name"
              className="h-12 px-4 rounded-xl bg-gray-50 border-gray-200 text-gray-800 focus-visible:border-brand focus-visible:ring-brand/20"
            />

            {errors.name && (
              <p className="text-red-500 text-sm mb-0.5">
                {errors.name.message}
              </p>
            )}

            <Label className="text-gray-600 mt-3">
              Email
            </Label>
            <Input
              {...register("email")}
              placeholder="Enter your email address"
              className="h-12 px-4 rounded-xl bg-gray-50 border-gray-200 text-gray-800 focus-visible:border-brand focus-visible:ring-brand/20"
            />

            {errors.email && (
              <p className="text-red-500 text-sm mb-0.5">
                {errors.email.message}
              </p>
            )}

            <Label className="text-gray-600 mt-3">
              Password
            </Label>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="Create a password"
                className="h-12 px-4 rounded-xl bg-gray-50 border-gray-200 text-gray-800 focus-visible:border-brand focus-visible:ring-brand/20"
              />

              <Button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:bg-transparent bg-transparent text-gray-500 rounded-xl absolute top-1/2 -translate-y-1/2 right-2 z-10"
              >
                {showPassword ? <Eye /> : <EyeOff />}
              </Button>
            </div>

            {errors.password && (
              <p className="text-red-500 text-sm mb-0.5">
                {errors.password.message}
              </p>
            )}

            <div className="w-full relative rounded-xl overflow-hidden pt-3">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-brand text-white text-base font-medium shadow-md shadow-brand/30 hover:bg-brand-dark"
              >
                Sign up
              </Button>

              {emailLoading && (
                <LoadOlderMessages isComponent={true} />
              )}
            </div>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-gray-400 text-sm">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="w-full relative rounded-xl overflow-hidden">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              className="w-full h-12 rounded-xl bg-white border-gray-200 text-gray-700 text-base font-medium hover:bg-gray-50"
            >
              <Image
                src={google}
                alt="google-icon"
                width={20}
                height={20}
              />

              Continue with Google
            </Button>

            {googleLoading && (
              <LoadOlderMessages isComponent={true} />
            )}
          </div>

          <span className="text-center text-gray-500 mt-8">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand font-medium hover:underline"
            >
              Sign in
            </Link>
          </span>
        </>
      )}
    </AuthShell>
  );
};

export default SignupPage;
