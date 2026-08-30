<template>
  <PageShell
    title="开通会员"
    :back-fallback="ROUTES.themeCenter"
  >
    <view class="card">
      <view class="title">
        乡声集盒会员
      </view>
      <view class="muted">
        该装扮为会员专属，开通会员即可解锁全部会员主题与装扮。
      </view>
      <view class="muted">
        开通后可解锁全部会员全局主题、会员局部装扮。权益在 H5 网页与微信小程序两端同步。
      </view>
      <view class="status">
        {{ member ? '当前已开通会员。' : '当前未开通会员。' }}
      </view>
      <BaseButton
        class="action"
        :variant="member ? 'ghost' : 'primary'"
        @click="onToggle"
      >
        {{ member ? '会员已生效' : '开通会员' }}
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
import { notifySuccess } from '@/services/feedback';
import { ROUTES } from '@/services/navigation';
import { trackThemeGet } from '@/services/themeAnalytics';
import {
  getMemberStatus,
  setMemberStatus,
  THEME_ACCESS_FOOTER,
} from '@/services/themeCenter';

export default {
  components: { BaseButton, PageShell },
  data() {
    return {
      ROUTES,
      member: getMemberStatus(),
      footerLines: THEME_ACCESS_FOOTER,
    };
  },
  onShow() {
    this.member = getMemberStatus();
  },
  methods: {
    onToggle() {
      if (this.member) {
        notifySuccess('会员权益已在两端同步');
        return;
      }
      trackThemeGet('', null, 'member');
      this.member = setMemberStatus(true);
      notifySuccess('会员已开通，装扮权益两端同步');
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

.action {
  margin-top: var(--space-3);
}

.foot-note {
  font-size: var(--font-size-xs);
}
</style>
