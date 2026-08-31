<template>
  <PageShell
    title="方言活动"
    :back-fallback="ROUTES.themeAcquire"
  >
    <view
      v-if="!item"
      class="card"
    >
      <view class="title">
        活动不存在
      </view>
      <view class="muted">
        该限定装扮活动已结束，无法获取
      </view>
    </view>
    <view
      v-else
      class="card"
      :class="{ ended: ended }"
    >
      <view class="title">
        {{ item.name }}
      </view>
      <view class="muted">
        {{ item.blurb || item.description }}
      </view>
      <view
        class="tag"
        :class="ended ? 'tag-ended' : 'tag-event'"
      >
        {{ ended ? '已绝版' : '活动限定' }}
      </view>
      <view
        v-if="ended && !owned"
        class="muted"
      >
        该装扮活动已结束，暂无法获取
      </view>
      <view
        v-else-if="owned"
        class="status"
      >
        已获得该装扮，可前往我的装扮使用
      </view>
      <view
        v-else
        class="muted"
      >
        完成同乡灯会任务后即可领取，活动结束后将绝版。
      </view>
      <BaseButton
        class="action"
        :disabled="ended && !owned"
        :variant="ended && !owned ? 'ghost' : 'primary'"
        @click="onClaim"
      >
        {{ claimLabel }}
      </BaseButton>
    </view>
    <view
      v-for="line in footerLines"
      :key="line"
      class="foot-note"
    >
      {{ line }}
    </view>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import PageShell from '@/components/PageShell.vue';
import { notify, notifySuccess } from '@/services/feedback';
import { ROUTES } from '@/services/navigation';
import { trackThemeApplyInvalid, trackThemeGet } from '@/services/themeAnalytics';
import {
  claimSkin,
  getDressItem,
  getThemeById,
  isOwned,
  THEME_ACCESS_FOOTER,
} from '@/services/themeCenter';

export default {
  components: { BaseButton, PageShell },
  data() {
    return {
      ROUTES,
      kind: 'theme',
      itemId: '',
      owned: false,
      footerLines: THEME_ACCESS_FOOTER,
    };
  },
  computed: {
    item() {
      if (this.kind === 'dress') return getDressItem(this.itemId);
      return getThemeById(this.itemId);
    },
    ended() {
      return this.item?.eventStatus === 'ended';
    },
    claimLabel() {
      if (this.ended && !this.owned) return '已绝版';
      if (this.owned) return '已领取';
      return '完成并领取';
    },
  },
  onLoad(options) {
    this.kind = options?.kind === 'dress' ? 'dress' : 'theme';
    this.itemId = options?.id || 'event-lantern';
    this.refresh();
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.owned = Boolean(this.item && isOwned(this.kind, this.item.id));
    },
    async onClaim() {
      if (!this.item) {
        notify({ title: '该限定装扮活动已结束，无法获取' });
        return;
      }
      if (this.ended && !this.owned) {
        trackThemeApplyInvalid(this.kind, this.item, '已绝版');
        notify({ title: '该限定装扮活动已结束，无法获取' });
        return;
      }
      if (this.owned) {
        notifySuccess('已获得该装扮，可前往我的装扮使用');
        return;
      }
      const claimed = await Promise.resolve(claimSkin(this.kind, this.item.id));
      if (!claimed?.ok) {
        notify({ title: claimed?.reason === 'ended'
          ? '该限定装扮活动已结束，无法获取'
          : '暂无权限使用该装扮' });
        return;
      }
      trackThemeGet(this.kind, this.item, 'event');
      this.refresh();
      notifySuccess('恭喜，已获得该装扮，可前往我的装扮使用');
    },
  },
};
</script>

<style scoped>
.card {
  margin-top: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
}

.card.ended {
  opacity: 0.84;
}

.title {
  font-weight: 700;
}

.muted,
.status,
.foot-note {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.status {
  color: var(--accent-color);
}

.tag {
  display: inline-block;
  margin-top: var(--space-2);
  padding: 0 var(--space-1);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  line-height: 36rpx;
}

.tag-event {
  background: var(--accent-subtle-color);
  color: var(--accent-color);
}

.tag-ended {
  background: var(--surface-subtle-color);
  color: var(--muted-color);
}

.action {
  margin-top: var(--space-3);
}

.foot-note {
  font-size: var(--font-size-xs);
}
</style>
