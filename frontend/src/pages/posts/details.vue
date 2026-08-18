<template>
  <PageShell
    title="表达详情"
    :content-class="{ 'detail-page': true }"
  >
    <view
      v-if="loading"
      class="skeleton"
    >
      <view class="sk-row" />
      <view class="sk-block" />
      <view class="sk-block tall" />
      <view class="sk-row" />
    </view>
    <view
      v-else-if="loadError"
      class="state-card error"
    >
      <view>{{ loadError }}</view>
      <button @tap="loadPost">
        重试
      </button>
      <button
        class="secondary"
        @tap="toHome"
      >
        返回首页
      </button>
    </view>
    <template v-else-if="post">
      <view class="author-row">
        <image
          class="avatar"
          :src="post.author.avatar"
          mode="aspectFill"
          @tap="toAuthor"
        />
        <view class="author-main">
          <view class="author-name-row">
            <text class="author-name">
              {{ post.author.nickname || post.author.username }}
            </text>
            <DialectBadge :dialect="post.author.primary_dialect" />
          </view>
          <view class="created-at">
            {{ relativeTime }}
          </view>
        </view>
      </view>

      <view class="post-text">
        {{ post.text || '用这段乡音表达了一次' }}
      </view>

      <CanPlayer
        :audio-url="post.can?.audio_url || ''"
        :duration-ms="post.can?.duration_ms || 0"
        :subtitle="fullSubtitle"
        :dialect-label="dialectLabel"
        :auto-continue="true"
      />

      <WordCard
        v-if="wordSummary"
        :word="wordSummary"
        :audio-url="post.can?.audio_url || ''"
      />

      <PostSourceBar
        :use-same-from="useSameFrom"
        :forward-from="forwardFrom"
      />

      <view
        id="comments"
        class="comments"
      >
        <view class="comments-title">
          评论 · {{ commentCount }}
        </view>
        <view
          v-if="!comments.length"
          class="comment-empty"
        >
          来发第一条评论
        </view>
        <view
          v-for="comment in comments"
          :key="comment.id"
          class="comment-row"
        >
          <image
            class="comment-avatar"
            :src="comment.author.avatar"
            mode="aspectFill"
          />
          <view class="comment-body">
            <view class="comment-head">
              <text class="comment-author">
                {{ comment.author.nickname || comment.author.username }}
              </text>
              <DialectBadge :dialect="comment.author.primary_dialect" />
              <text class="comment-time">
                {{ formatRelative(comment.created_at) }}
              </text>
            </view>
            <view class="comment-content">
              {{ comment.content }}
            </view>
          </view>
        </view>
        <view
          v-if="commentsHasMore"
          class="load-more"
        >
          <button
            :disabled="commentsLoading"
            @tap="loadMoreComments"
          >
            {{ commentsLoading ? '加载中…' : '查看更多评论' }}
          </button>
        </view>
        <view class="comment-composer">
          <textarea
            id="comment-input"
            v-model="commentText"
            class="comment-input"
            maxlength="500"
            :focus="focusComment"
            placeholder="说点什么…"
            @focus="onCommentFocus"
          />
          <button
            class="comment-submit"
            :disabled="commentSubmitting || !commentText.trim()"
            @tap="submitComment"
          >
            {{ commentSubmitting ? '发送中…' : '发送' }}
          </button>
        </view>
      </view>

      <view class="bottom-spacer" />
      <SocialBottomBar
        :liked="liked"
        :like-count="likeCount"
        :comment-count="commentCount"
        :like-busy="likeBusy"
        :repost-busy="repostBusy"
        @like="toggleLike"
        @comment="focusComments"
        @repost="repost"
        @use-same="useSame"
        @share="shareCurrent"
      />
    </template>
  </PageShell>
</template>

<script>
import CanPlayer from '@/components/CanPlayer.vue';
import DialectBadge from '@/components/DialectBadge.vue';
import PageShell from '@/components/PageShell.vue';
import PostSourceBar from '@/components/PostSourceBar.vue';
import SocialBottomBar from '@/components/SocialBottomBar.vue';
import WordCard from '@/components/WordCard.vue';
import { requireAuth } from '@/services/authGuard';
import {
  createCanComment,
  getCanPost,
  likeCan,
  listCanComments,
  repostCan,
  unlikeCan,
} from '@/services/canSocial';
import { startUseSame } from '@/services/canPostJourney';
import { notify, notifySuccess } from '@/services/feedback';
import { goHome, goUserDetail } from '@/services/navigation';

function formatRelative(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16);
  }
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return String(value).replace('T', ' ').slice(0, 10);
}

export default {
  components: {
    CanPlayer,
    DialectBadge,
    PageShell,
    PostSourceBar,
    SocialBottomBar,
    WordCard,
  },
  data() {
    return {
      id: 0,
      loadError: '',
      loading: true,
      post: null,
      liked: false,
      likeCount: 0,
      likeBusy: false,
      repostBusy: false,
      comments: [],
      commentsPage: 1,
      commentsHasMore: false,
      commentsLoading: false,
      commentText: '',
      commentSubmitting: false,
      focusComment: false,
      scrollToComments: false,
    };
  },
  computed: {
    relativeTime() {
      return formatRelative(this.post?.created_at);
    },
    fullSubtitle() {
      return this.post?.can?.concept_text || '';
    },
    dialectLabel() {
      return this.post?.can?.submitted_dialect?.name
        || this.post?.can?.submitted_dialect?.qualified_code
        || '';
    },
    wordSummary() {
      const plate = this.post?.can?.primary_nameplate;
      if (!plate?.flavor?.id && !plate?.display_text) return null;
      return {
        id: plate.flavor?.id || null,
        text: plate.display_text || plate.flavor?.name || '',
        dialect: plate.dialect?.name || plate.dialect?.qualified_code || this.dialectLabel,
        gloss: plate.definition || this.post?.can?.concept_text || '',
      };
    },
    useSameFrom() {
      return this.post?.source?.use_same_from || null;
    },
    forwardFrom() {
      const raw = this.post?.source?.forward_from;
      if (!raw) return null;
      return {
        postId: raw.post_id,
        authorName: raw.author_name,
        snippet: raw.snippet,
        canSubtitle: raw.can_subtitle,
        sourceUnavailable: raw.source_unavailable,
        audioUrl: this.post?.source?.audio_url,
      };
    },
    commentCount() {
      return this.post?.can?.comment_count || this.comments.length;
    },
    canId() {
      return this.post?.source?.can_id || this.post?.can?.id;
    },
  },
  async onLoad(options = {}) {
    this.id = Number(options.id || 0);
    this.scrollToComments = options.scrollTo === 'comments'
      || options.focusComment === '1'
      || options.focus === 'comments';
    await this.loadPost();
    if (this.scrollToComments) {
      this.$nextTick(() => this.focusComments());
    }
  },
  onHide() {
    // CanPlayer beforeUnmount also pauses; keep page-level safety.
  },
  onShareAppMessage() {
    return {
      title: this.post?.text || '听听这段乡音表达',
      path: `/pages/posts/details?id=${this.id}`,
    };
  },
  methods: {
    formatRelative,
    toHome() {
      goHome(true);
    },
    toAuthor() {
      if (this.post?.author?.id) goUserDetail(this.post.author.id);
    },
    async loadPost() {
      if (!this.id) {
        this.loadError = '帖子不存在';
        this.loading = false;
        return;
      }
      this.loading = true;
      this.loadError = '';
      try {
        this.post = await getCanPost(this.id);
        this.liked = Boolean(this.post.can?.liked_by_me);
        this.likeCount = Number(this.post.can?.like_count || 0);
        await this.loadComments(true);
      } catch (error) {
        const status = error?.statusCode || error?.code;
        if (status === 404) this.loadError = '帖子不存在或已删除';
        else this.loadError = error.message || '加载失败，请检查网络后重试';
      } finally {
        this.loading = false;
      }
    },
    async loadComments(reset = false) {
      if (!this.canId) return;
      if (reset) {
        this.commentsPage = 1;
        this.comments = [];
      }
      this.commentsLoading = true;
      try {
        const response = await listCanComments(this.canId, {
          page: this.commentsPage,
          page_size: 20,
        });
        const items = response.results || response || [];
        this.comments = reset ? items : this.comments.concat(items);
        this.commentsHasMore = Boolean(response.next);
      } catch (error) {
        notify({ title: error?.message || '评论加载失败' });
      } finally {
        this.commentsLoading = false;
      }
    },
    async loadMoreComments() {
      if (!this.commentsHasMore || this.commentsLoading) return;
      this.commentsPage += 1;
      await this.loadComments(false);
    },
    focusComments() {
      uni.pageScrollTo({ selector: '#comments', duration: 200 });
      if (!requireAuth('comment', {
        page: 'post_detail',
        postId: this.id,
        canId: this.canId,
        scrollTo: 'comments',
      })) return;
      this.focusComment = false;
      this.$nextTick(() => {
        this.focusComment = true;
      });
    },
    onCommentFocus() {
      if (!requireAuth('comment', {
        page: 'post_detail',
        postId: this.id,
        canId: this.canId,
        scrollTo: 'comments',
      })) {
        this.focusComment = false;
      }
    },
    async submitComment() {
      const content = String(this.commentText || '').trim();
      if (!content) {
        notify({ title: '请输入评论内容' });
        return;
      }
      if (content.length > 500) {
        notify({ title: '评论最多 500 字' });
        return;
      }
      if (!requireAuth('comment', {
        page: 'post_detail',
        postId: this.id,
        canId: this.canId,
        scrollTo: 'comments',
      })) return;
      if (!this.canId || this.commentSubmitting) return;
      this.commentSubmitting = true;
      try {
        const created = await createCanComment(this.canId, content);
        this.comments = [...this.comments, created];
        this.commentText = '';
        if (this.post?.can) {
          this.post.can.comment_count = Number(this.post.can.comment_count || 0) + 1;
        }
        notifySuccess('发送成功');
      } catch (error) {
        notify({ title: error?.message || '发送失败' });
      } finally {
        this.commentSubmitting = false;
      }
    },
    async toggleLike() {
      if (!this.canId) return;
      if (!requireAuth('like', {
        page: 'post_detail',
        postId: this.id,
        canId: this.canId,
      })) return;
      if (this.likeBusy) return;
      const previousLiked = this.liked;
      const previousCount = this.likeCount;
      this.liked = !previousLiked;
      this.likeCount = Math.max(0, previousCount + (this.liked ? 1 : -1));
      this.likeBusy = true;
      try {
        const response = previousLiked
          ? await unlikeCan(this.canId)
          : await likeCan(this.canId);
        this.liked = Boolean(response.liked);
        this.likeCount = Number(response.like_count || this.likeCount);
        uni.$emit('can-like-changed', {
          canId: this.canId,
          liked: this.liked,
          likeCount: this.likeCount,
        });
      } catch (error) {
        this.liked = previousLiked;
        this.likeCount = previousCount;
        notify({ title: error?.message || '点赞失败' });
      } finally {
        this.likeBusy = false;
      }
    },
    async repost() {
      if (!this.canId) return;
      if (!requireAuth('repost', {
        page: 'post_detail',
        postId: this.id,
        canId: this.canId,
      })) return;
      if (this.repostBusy) return;
      this.repostBusy = true;
      try {
        await repostCan(this.canId, { forwardFromPostId: this.id });
        notifySuccess('转发成功');
      } catch (error) {
        notify({ title: error?.message || '转发失败' });
      } finally {
        this.repostBusy = false;
      }
    },
    useSame() {
      startUseSame(this.canId, {
        page: 'post_detail',
        postId: this.id,
      });
    },
    async shareCurrent() {
      const path = `/pages/posts/details?id=${this.id}`;
      // #ifdef H5
      const url = `${window.location.origin}${path}`;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          notifySuccess('已复制');
          return;
        }
      } catch (error) {
        // fall through
      }
      // #endif
      uni.setClipboardData({
        data: path,
        success: () => notifySuccess('已复制'),
      });
    },
  },
};
</script>

<style scoped>
.skeleton {
  padding: 24rpx 0 120rpx;
}

.sk-row,
.sk-block {
  margin-bottom: 18rpx;
  border-radius: var(--radius-sm);
  background: var(--surface-subtle-color);
}

.sk-row {
  height: 72rpx;
}

.sk-block {
  height: 120rpx;
}

.sk-block.tall {
  height: 220rpx;
}

.state-card {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  color: var(--text-secondary-color);
  font-size: var(--font-size-md);
}

.state-card.error button {
  margin-top: 18rpx;
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
}

.state-card.error .secondary {
  background: var(--surface-color);
  color: var(--accent-color);
  border: 1px solid var(--border-color);
}

.author-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--surface-subtle-color);
}

.author-main {
  min-width: 0;
  flex: 1;
}

.author-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
}

.author-name {
  font-size: 30rpx;
  font-weight: 800;
}

.created-at {
  margin-top: 6rpx;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.post-text {
  margin-top: 22rpx;
  color: var(--text-color);
  font-size: var(--font-size-lg);
  line-height: 1.65;
  white-space: pre-wrap;
}

.comments {
  margin-top: 28rpx;
  padding-bottom: 24rpx;
}

.comments-title {
  font-size: 30rpx;
  font-weight: 800;
}

.comment-empty {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.comment-row {
  display: flex;
  gap: 14rpx;
  margin-top: 18rpx;
}

.comment-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--surface-subtle-color);
}

.comment-body {
  min-width: 0;
  flex: 1;
}

.comment-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
}

.comment-author {
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.comment-time {
  color: var(--muted-color);
  font-size: 20rpx;
}

.comment-content {
  margin-top: 6rpx;
  color: var(--text-secondary-color);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.comment-composer {
  margin-top: 22rpx;
  padding: 18rpx;
  border-radius: var(--radius-md);
  background: var(--surface-subtle-color);
  border: 1px solid var(--border-color);
}

.comment-input {
  width: 100%;
  min-height: 120rpx;
  font-size: var(--font-size-sm);
}

.comment-submit,
.load-more button {
  margin-top: 14rpx;
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
}

.comment-submit::after,
.load-more button::after,
.state-card button::after {
  border: 0;
}

.bottom-spacer {
  height: 140rpx;
}
</style>
