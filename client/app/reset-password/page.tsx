"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetPasswordFormData, resetPasswordSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import LoadOlderMessages from "@/components/LoadOlderMessages";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<resetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleResetPassword = async (data: resetPasswordFormData) => {
    if (!token) {
      toast.error("Invalid reset session. Please request a new link.");
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: data.password,
      token: token,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to update your password.");
      return;
    }

    setIsSuccess(true);
  };

  return (
    <div className="min-h-screen w-screen flex justify-center items-center overflow-y-auto">
      <div className="sm:max-w-150 w-full m-2 px-8 md:px-10 flex flex-col min-h-max py-10 rounded-xl border border-gray-50 shadow-lg">
        <Image src="/logo-dark.svg" alt="logo" width={150} height={50} className="mb-8" />

        {isSuccess ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>

            <h3 className="text-xl font-semibold mb-3">
              Password updated successfully
            </h3>

            <p className="text-gray-500 text-sm leading-6 max-w-sm mb-6">
              Your new password is active. You can now use it to sign in to your account.
            </p>

            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 text-white py-5 hover:bg-blue-800"
            >
              Back to Sign In
            </Button>
          </div>
        ) : !token ? (
          <div className="text-center py-6">
            <h3 className="text-lg font-semibold text-red-500 mb-2">Invalid or Expired Link</h3>
            <p className="text-sm text-gray-500 mb-6">
              This password reset link has expired, request a new link from the login page
            </p>
            <Button onClick={() => router.push("/login")} className="w-full bg-black py-5">
              Return to Login Page
            </Button>
          </div>
        ) : (
          <>
            <h3 className="mb-6">Create new password</h3>
            <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-4">
              
              <div>
                <Label className="text-gray-500">New Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="Enter your new password"
                    className="py-5! px-3! rounded-md text-gray-800"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:bg-transparent bg-transparent text-black rounded-xl absolute top-1/2 -translate-y-1/2 right-3 z-10"
                  >
                    {showPassword ? <Eye /> : <EyeOff />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label className="text-gray-500">Confirm New Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                    placeholder="Repeat your new password"
                    className="py-5! px-3! rounded-md text-gray-800"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="hover:bg-transparent bg-transparent text-black rounded-xl absolute top-1/2 -translate-y-1/2 right-3 z-10"
                  >
                    {showConfirmPassword ? <Eye /> : <EyeOff />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="w-full relative pt-2">
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white py-5 mt-2 hover:bg-blue-800"
                >
                  {loading ? "Updating..." : "Reset password"}
                </Button>
                {loading && (
                  <LoadOlderMessages isComponent={true} />
                )}
              </div>

            </form>
          </>
        )}
      </div>
    </div>
  );
}
