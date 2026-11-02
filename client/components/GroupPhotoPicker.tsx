"use client";

import { Camera } from "lucide-react";
import UserAvatar from "./UserAvatar";

// the group avatar, clicking it opens the file picker for a new photo
const GroupPhotoPicker = ({name, src, disabled, onPick}: {
  name: string,
  src?: string,
  disabled?: boolean,
  onPick: (file: File) => void,
}) => {
  return (
    <label className={`relative block rounded-full ring-4 ring-brand-light shadow-lg ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <UserAvatar name={name} src={src} className="size-28 text-4xl" />
      <span className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full bg-brand text-white border-2 border-white">
        <Camera className="size-4" />
      </span>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // the same photo can be picked again after this
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
    </label>
  )
}

export default GroupPhotoPicker
