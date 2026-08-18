<template>
  <view class="social-feeds">
    <view class="feed-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['feed-tab', { active: activeFeed === tab.key }]"
        @tap="activate(tab.key)"
      >
        {{ tab.label }}
      </button>
      <button
        class="feed-tab disabled"
        disabled
      >
        同城
      </button>
    </view>
    <view
      v-if="activeFeed === 'recommended'"
      class="recommend-hint"
    >
      为你推荐 · 仍偏{{ dialectHint }}乡音
    </view>
    <view
      v-for="(tab, index) in tabs"
      v-show="activeFeed === tab.key"
      :key="tab.key"
      class="feed-pane"
    >
      <CanList
        ref="feedLists"
        :auto-load="false"
        :fetcher="fetcher"
        :query="tab.query"
        :empty-title="tab.emptyTitle"
        :empty-description="tab.emptyDescription"
        :empty-action-text="tab.emptyActionText"
        social
        @author="$emit('author', $event)"
        @comment="$emit('comment', $event)"
        @open="$emit('open', $event)"
        @share="$emit('share', $event)"
        @empty-action="onEmptyAction(tab.key)"
        @loaded="markLoaded(index)"
      />
    </view>
  </view>
</template>

<script>
import { toFollowRecommendations } from '@/routers/user';
import CanList from './CanList.vue';

export default {
  name: 'SocialCanFeeds',
  components: { CanList },
  props: {
    fetcher: {
      type: Function,
      required: true,
    },
    dialectName: {
      type: String,
      default: '你的方言',
    },
  },
  emits: ['author', 'comment', 'open', 'share', 'empty-create', 'empty-recommend'],
  data() {
    return {
      activeFeed: 'dialect',
      loaded: {},
      scrollMemory: {},
      tabs: [
        {
          key: 'dialect',
          query: { feed: 'dialect' },
          label: '同方言',
          emptyTitle: '这个方言暂时还少',
          emptyDescription: '去录第一罐 / 去发现热罐 / 切换看看推荐里的乡音',
          emptyActionText: '录第一罐',
        },
        {
          key: 'following',
          query: { feed: 'following' },
          label: '关注',
          emptyTitle: '关注流还是空的',
          emptyDescription: '去认识几位同方言的人，关注流就会有内容',
          emptyActionText: '去推荐关注',
        },
        {
          key: 'recommended',
          query: { feed: 'recommended' },
          label: '推荐',
          emptyTitle: '暂时没有推荐',
          emptyDescription: '公开罐头增加后，这里会优先展示与你方言相关的内容。',
          emptyActionText: '',
        },
      ],
    };
  },
  computed: {
    dialectHint() {
      return this.dialectName || '你的方言';
    },
  },
  mounted() {
    this.$nextTick(() => this.loadActive());
  },
  methods: {
    activate(key) {
      this.rememberActiveScroll();
      this.activeFeed = key;
      this.$nextTick(() => {
        this.loadActive();
        this.restoreActiveScroll();
      });
    },
    activeIndex() {
      return this.tabs.findIndex((tab) => tab.key === this.activeFeed);
    },
    feedList(index) {
      const refs = this.$refs.feedLists || [];
      return Array.isArray(refs) ? refs[index] : refs;
    },
    loadActive() {
      const index = this.activeIndex();
      if (index < 0 || this.loaded[this.activeFeed]) return;
      const list = this.feedList(index);
      if (list) list.refresh();
    },
    markLoaded(index) {
      const tab = this.tabs[index];
      if (tab) this.loaded = { ...this.loaded, [tab.key]: true };
    },
    rememberActiveScroll() {
      const index = this.activeIndex();
      const list = this.feedList(index);
      if (!list || typeof list.captureScroll !== 'function') return;
      this.scrollMemory = {
        ...this.scrollMemory,
        [this.activeFeed]: list.captureScroll(),
      };
    },
    restoreActiveScroll() {
      const memory = this.scrollMemory[this.activeFeed];
      if (!memory) return;
      const index = this.activeIndex();
      const list = this.feedList(index);
      if (list && typeof list.restoreScroll === 'function') {
        list.restoreScroll(memory.scrollTop || 0);
      }
    },
    captureAllScroll() {
      this.rememberActiveScroll();
      return {
        activeFeed: this.activeFeed,
        scrollMemory: { ...this.scrollMemory },
      };
    },
    restoreAllScroll(snapshot) {
      if (!snapshot) return;
      if (snapshot.activeFeed) this.activeFeed = snapshot.activeFeed;
      this.scrollMemory = { ...(snapshot.scrollMemory || {}) };
      this.$nextTick(() => this.restoreActiveScroll());
    },
    onEmptyAction(key) {
      if (key === 'following') {
        this.$emit('empty-recommend');
        toFollowRecommendations();
        return;
      }
      if (key === 'dialect') {
        this.$emit('empty-create');
      }
    },
  },
};
</script>

<style scoped>
.social-feeds {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  margin-top: 24rpx;
}

.feed-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 7rpx;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
}

.feed-tab {
  margin: 0;
  border-radius: 999rpx;
  background: transparent;
  color: var(--muted-color);
  font-size: 23rpx;
  line-height: 60rpx;
}

.feed-tab.active {
  background: var(--surface-color);
  color: var(--accent-color);
  font-weight: 800;
  box-shadow: 0 3rpx 12rpx rgb(40 75 57 / 10%);
}

.feed-tab.disabled {
  opacity: 0.45;
  color: var(--muted-color);
}

.feed-tab::after {
  border: 0;
}

.recommend-hint {
  margin-top: 16rpx;
  color: var(--muted-color);
  font-size: 22rpx;
}

.feed-pane {
  min-height: 0;
  flex: 1;
  padding-top: 20rpx;
}
</style>
