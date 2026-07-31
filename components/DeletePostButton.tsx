"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/app/posts/[slug]/actions";

export default function DeletePostButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("정말 이 글을 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;

    setDeleting(true);
    try {
      await deletePost(slug);
      router.push("/posts");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  return (
    <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} disabled={deleting} onClick={handleDelete}>
      {deleting ? "삭제 중..." : "삭제"}
    </button>
  );
}
