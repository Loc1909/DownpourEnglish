import logging
from typing import List, Optional

from django.db.models import QuerySet

from api.models import FlashcardSet, Topic
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class AISuggestionService:
    """Service gợi ý bộ flashcard theo chủ đề bằng embeddings (SBERT/FAISS) với fallback an toàn.
    - Nếu không cài được thư viện ML, sẽ fallback sang xếp hạng theo mức độ phổ biến/đánh giá.
    - Thiết kế dạng singleton để dùng chung model/encoder trong process.
    """

    # Singleton pattern: đảm bảo 1 class chỉ có duy nhất 1 instance
    _instance: Optional["AISuggestionService"] = None

    # Constructor
    def __init__(self) -> None:
        self._encoder = None
        self._use_embeddings = False
        try:
            self._encoder = SentenceTransformer("all-MiniLM-L6-v2")
            self._use_embeddings = True
            logger.info("AISuggestionService: Loaded SBERT model all-MiniLM-L6-v2")
            try:
                _ = self._encoder.encode(["warmup"], normalize_embeddings=True, convert_to_numpy=True)
            except Exception as warmup_exc:
                logger.warning("AISuggestionService: warm-up encode failed: %s", warmup_exc)
        except Exception as exc:
            logger.warning(
                "AISuggestionService: sentence-transformers not available, falling back. Error: %s",
                exc,
            )


    @classmethod
    def get_instance(cls) -> "AISuggestionService":
        if cls._instance is None:
            cls._instance = AISuggestionService()
        return cls._instance

    def _encode(self, texts: List[str]):
        if not self._use_embeddings or self._encoder is None:
            return None
        try:
            embeddings = self._encoder.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
            return embeddings
        except Exception as exc:  # pragma: no cover
            logger.error("AISuggestionService: encode failed, fallback. Error: %s", exc)
            return None

    def _rank_by_embeddings(self, topic: Topic, candidate_sets: QuerySet, top_k: int) -> List[FlashcardSet]:
        # Chuẩn bị văn bản: chủ đề và từng bộ flashcard (tiêu đề + mô tả)
        topic_text = f"{topic.name or ''}. {topic.description or ''}".strip()
        set_texts: List[str] = []
        sets_list: List[FlashcardSet] = list(candidate_sets)
        for s in sets_list:
            set_texts.append(f"{s.title or ''}. {s.description or ''}".strip())

        if not set_texts:
            return []

        topic_embeds = self._encode([topic_text])
        set_embeds = self._encode(set_texts)

        if topic_embeds is None or set_embeds is None:
            # Không thể encode => fallback
            return self._rank_by_popularity(candidate_sets, top_k)

        # Tính cosine similarity vì embeddings đã được normalize
        import numpy as np  # local import để tránh hard dep khi fallback

        query = topic_embeds[0]
        scores = np.dot(set_embeds, query) # tính độ tương đồng
        # Lấy top_k theo điểm giảm dần
        top_indices = np.argsort(-scores)[:top_k]
        ranked = [
            {"set": sets_list[i], "score": float(scores[i])}
            for i in top_indices
        ]
        return ranked

    def _rank_by_popularity(self, candidate_sets: QuerySet, top_k: int) -> List[FlashcardSet]:
        # Fallback: ưu tiên nhiều lượt lưu, rating cao, mới tạo
        qs = (
            candidate_sets.order_by("-total_saves", "-average_rating", "-created_at")
        )
        return list(qs[:top_k])

    def suggest_sets_for_topic(self, topic: Topic, top_k: int = 10) -> List[FlashcardSet]:
        candidates = FlashcardSet.objects.select_related("creator", "topic").filter(
            is_public=True
        )

        if not candidates.exists():
            return []

        if self._use_embeddings:
            ranked = self._rank_by_embeddings(topic, candidates, top_k)
            ranked = [r for r in ranked if r["score"] >= 0.6]
            ranked = [r["set"] for r in ranked]
        else:
            ranked = self._rank_by_popularity(candidates, top_k)

        return ranked


