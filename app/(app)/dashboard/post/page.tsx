import { PostFoodForm } from "@/components/forms/post-food-form";

export const metadata = { title: "Post surplus food" };

export default function PostPage() {
  // Photo upload is optional: only offered when Cloudinary is configured on the server.
  const photosEnabled = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Post surplus food</h1>
        <p className="text-muted-foreground">We work out how long it stays safe and alert receivers who can reach you in time.</p>
      </div>
      <PostFoodForm photosEnabled={photosEnabled} />
    </div>
  );
}
