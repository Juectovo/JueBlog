import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
} as const;

/**
 * 用户头像：有图显示图，无图回退首字母
 * 头像 URL 可能来自 GitHub（avatars.githubusercontent.com），直接用原生 img 经 Radix 展示
 */
export function UserAvatar({
  name,
  image,
  size = "md",
  className,
}: {
  name: string;
  image?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <AvatarImage src={image} alt={name} />
      ) : null}
      <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
