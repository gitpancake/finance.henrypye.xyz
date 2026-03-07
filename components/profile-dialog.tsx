"use client";

import { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/lib/actions/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Camera, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0]?.toUpperCase() ?? "?";
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
  });
}

export default function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Crop state
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!cropImage || !croppedAreaPixels) return;

    setUploadingAvatar(true);
    setCropImage(null);
    try {
      const blob = await getCroppedImg(cropImage, croppedAreaPixels);
      const formData = new FormData();
      formData.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      await uploadAvatar(formData);

      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken(true);
        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      }
      await refreshUser();
      toast.success("Profile picture updated");
    } catch {
      toast.error("Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUpdateName = async () => {
    setSavingName(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) throw new Error("Not signed in");
      await updateProfile(auth.currentUser, { displayName });

      const idToken = await auth.currentUser.getIdToken(true);
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      await refreshUser();
      toast.success("Display name updated");
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    setSavingEmail(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) throw new Error("Not signed in");
      await verifyBeforeUpdateEmail(auth.currentUser, email);
      toast.success("Verification email sent to " + email);
    } catch {
      toast.error("Failed to update email");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSavingPassword(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser || !auth.currentUser.email)
        throw new Error("Not signed in");

      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch {
      toast.error("Failed to update password. Check your current password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-16">
                  {user.photoURL && (
                    <AvatarImage
                      src={user.photoURL}
                      alt={user.displayName ?? ""}
                    />
                  )}
                  <AvatarFallback className="text-lg">
                    {getInitials(user.displayName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Camera className="size-3" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {user.displayName ?? "No name set"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {/* Display Name */}
            <Field>
              <FieldLabel>Display Name</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
                <Button
                  size="sm"
                  onClick={handleUpdateName}
                  disabled={
                    savingName || displayName === (user.displayName ?? "")
                  }
                >
                  {savingName ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </Button>
              </div>
            </Field>

            {/* Email */}
            <Field>
              <FieldLabel>Email</FieldLabel>
              <FieldDescription>
                A verification email will be sent to confirm the change.
              </FieldDescription>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={handleUpdateEmail}
                  disabled={savingEmail || email === user.email}
                >
                  {savingEmail ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </Button>
              </div>
            </Field>

            {/* Password */}
            <Field>
              <FieldLabel>Change Password</FieldLabel>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdatePassword}
                    disabled={
                      savingPassword || !currentPassword || !newPassword
                    }
                  >
                    {savingPassword ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Field>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      <Dialog open={!!cropImage} onOpenChange={(o) => { if (!o) { setCropImage(null); if (fileRef.current) fileRef.current.value = ""; } }}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <div className="relative h-72 bg-black">
            {cropImage && (
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center justify-between p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCropImage(null); if (fileRef.current) fileRef.current.value = ""; }}
            >
              <X className="size-4 mr-1" />
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-24 accent-primary"
              />
              <Button size="sm" onClick={handleCropSave}>
                <Check className="size-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
