"use client";
// Pattern: a query key + api<T>() call + shared Zod type. Add one hook per endpoint.
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ProfileDTO } from "@/lib/schemas/profile";
import type { SignUploadBody, SignUploadResponse } from "@/lib/schemas/upload";
import { api } from "./client";

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api<ProfileDTO>("/api/v1/me") });

export const useSignUpload = () =>
  useMutation({
    mutationFn: (body: SignUploadBody) =>
      api<SignUploadResponse>("/api/v1/uploads/sign", { method: "POST", body }),
  });
