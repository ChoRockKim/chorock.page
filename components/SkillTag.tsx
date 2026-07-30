import { normalizeSkillName, SKILL_ICON_SLUGS } from "@/lib/skillIcons";

export default function SkillTag({ name, icon }: { name: string; icon?: string }) {
  const slug = icon ?? SKILL_ICON_SLUGS[normalizeSkillName(name)];

  return (
    <span className="tag tag-outline" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {slug && (
        // eslint-disable-next-line @next/next/no-img-element -- small brand icon from an external CDN, not a page asset next/image should optimize
        <img src={`https://cdn.simpleicons.org/${slug}`} width={13} height={13} alt="" style={{ display: "block" }} />
      )}
      {name}
    </span>
  );
}
