<template>
  <PageShell
    :title="group ? group.name : '局部装扮'"
    :back-fallback="ROUTES.themeCenter"
  >
    <view
      v-if="!group"
      class="empty-wrap"
    >
      <EmptyState title="该分类装扮素材即将上线，敬请期待" />
    </view>
    <view v-else>
      <view class="lead">
        <view class="muted">
          {{ group.hint }}
        </view>
        <view
          v-if="blocked"
          class="warn"
        >
          当前小程序环境暂不支持该装扮
        </view>
        <view
          v-else-if="overlay"
          class="warn"
        >
          已开启全局主题覆盖，应用后会暂时失效。
        </view>
        <view
          v-else
          class="muted"
        >
          应用后只改这一类部件，其它已选装扮保留。
        </view>
      </view>

      <view
        v-if="hasUpcomingItems"
        class="lead"
      >
        该分类装扮素材即将上线，敬请期待
      </view>

      <view class="filter-row">
        <view
          v-for="item in sortOptions"
          :key="item.value"
          class="chip pressable"
          :class="{ active: dressSort === item.value }"
          @tap="dressSort = item.value"
        >
          {{ item.label }}
        </view>
      </view>

      <view
        v-if="!items.length"
        class="empty-wrap"
      >
        <EmptyState title="该分类装扮素材即将上线，敬请期待" />
      </view>

      <view
        v-for="item in items"
        :key="item.id"
        class="item-card pressable"
        :class="{ placeholder: !item.available, applied: item.id === appliedId }"
        @tap="openDetail(item)"
      >
        <view class="shot-wrap">
          <view
            class="thumb"
            :class="[`thumb-${item.preview}`, { blurred: !item.available }]"
          >
            <view class="thumb-bar" />
            <view class="thumb-card" />
          </view>
          <view
            v-if="!item.available"
            class="soon-overlay"
          >
            敬请期待
          </view>
        </view>
        <view class="item-body">
          <view class="item-head">
            <view class="item-name">
              {{ item.name }}
            </view>
            <view
              class="tag"
              :class="tagClass(item)"
            >
              {{ item.tag }}
            </view>
          </view>
          <view class="muted">
            {{ item.description }}
          </view>
          <view
            v-if="dressAccess(item).hint"
            class="warn"
          >
            {{ dressAccess(item).hint }}
          </view>
          <view
            v-if="item.id === appliedId"
            class="applied-mark"
          >
            已应用{{ overlay ? ' · 暂时失效' : '' }}
          </view>
          <view
            class="theme-action-wrap"
            @tap.stop
          >
            <view
              class="icon-btn"
              :class="{
                on: isItemFav(item.id),
                disabled: !item.available,
              }"
              @tap="onToggleFavorite(item)"
            >
              {{ isItemFav(item.id) ? '★' : '☆' }}
            </view>
            <view
              class="icon-btn"
              :class="{ disabled: !item.available }"
              @tap="onShare(item)"
            >
              ↗
            </view>
            <BaseButton
              class="item-action"
              size="extra-small"
              :variant="itemActionVariant(item)"
              :disabled="itemActionDisabled(item)"
              @click="onApply(item)"
            >
              {{ applyLabel(item) }}
            </BaseButton>
          </view>
        </view>
      </view>
      <view
        v-for="line in accessFooter"
        :key="line"
        class="foot-note"
      >
        {{ line }}
      </view>
      <view
        v-for="line in socialFooter"
        :key="`social-${line}`"
        class="foot-note"
      >
        {{ line }}
      </view>
      <view
        v-for="line in previewFooter"
        :key="`preview-${line}`"
        class="foot-note"
      >
        {{ line }}
      </view>
    </view>

    <view
      v-if="detailItem"
      class="sheet-mask"
      @tap="closeDetail"
    >
      <view class="sheet-mask-dim" />
      <view
        class="sheet"
        @tap.stop
      >
        <view class="shot-wrap">
          <view
            class="sheet-tools"
            @tap.stop
          >
            <view
              class="icon-btn"
              :class="{
                on: isItemFav(detailItem.id),
                disabled: !detailItem.available,
              }"
              @tap="onToggleFavorite(detailItem)"
            >
              {{ isItemFav(detailItem.id) ? '★' : '☆' }}
            </view>
            <view
              class="icon-btn"
              :class="{ disabled: !detailItem.available }"
              @tap="onShare(detailItem)"
            >
              ↗
            </view>
          </view>
          <view
            class="thumb thumb-lg"
            :class="[`thumb-${detailItem.preview}`, { blurred: !detailItem.available }]"
          >
            <view class="thumb-bar" />
            <view class="thumb-card" />
          </view>
          <view
            v-if="!detailItem.available"
            class="soon-overlay"
          >
            敬请期待
          </view>
          <view
            v-if="isMiniProgram"
            class="preview-corner"
          >
            ⚠️小程序部分原生组件为系统默认样式
          </view>
        </view>
        <view class="item-name">
          {{ detailItem.name }}
        </view>
        <view class="muted">
          {{ group.name }}
        </view>
        <view class="muted">
          {{ detailItem.description }}
        </view>
        <view class="muted">
          预览仅为模拟效果，不会修改你的界面
        </view>
        <view
          class="tag"
          :class="tagClass(detailItem)"
        >
          {{ detailItem.tag }}
        </view>
        <view
          class="social-stats pressable"
          @tap="onToggleLike(detailItem)"
        >
          {{ statsOf(detailItem).liked ? '♥' : '♡' }}
          热度 {{ statsOf(detailItem).likes }}
          · 收藏 {{ statsOf(detailItem).favorites }}
        </view>
        <view class="muted">
          喜欢仅代表喜爱，不等于拥有该装扮
        </view>
        <view
          v-if="dressAccess(detailItem).hint"
          class="hint-row"
        >
          {{ dressAccess(detailItem).hint }}
        </view>
        <view class="hint-row">
          H5网页版：完整生效
        </view>
        <view class="hint-row warn">
          {{ mpHintFor(detailItem) }}
        </view>
        <view class="muted">
          {{ group.feature }}
        </view>
        <view
          v-if="!detailItem.available"
          class="warn"
        >
          装扮素材即将上线
        </view>
        <view class="sheet-actions">
          <BaseButton
            variant="ghost"
            size="small"
            @click="closeDetail"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="small"
            :disabled="!detailItem.available"
            @click="onToggleFavorite(detailItem)"
          >
            {{ isItemFav(detailItem.id) ? '取消收藏' : '加入收藏' }}
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="small"
            :disabled="!detailItem.available"
            @click="onShare(detailItem)"
          >
            分享
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="small"
            :disabled="!canLivePreviewItem(detailItem)"
            @click="openLivePreview(detailItem)"
          >
            实时预览
          </BaseButton>
          <BaseButton
            size="small"
            :variant="itemActionVariant(detailItem)"
            :disabled="itemActionDisabled(detailItem)"
            @click="onApply(detailItem)"
          >
            {{ applyLabel(detailItem) }}
          </BaseButton>
        </view>
      </view>
    </view>

    <ThemeLivePreview
      :open="previewOpen"
      title="实时预览"
      :model="livePreviewModel"
      @cancel="closePreview"
      @apply="onConfirmPreview"
    />

    <ThemeShareSheet
      :target="shareTarget"
      :is-mini-program="isMiniProgram"
      @close="shareTarget = null"
    />
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import confirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState.vue';
import PageShell from '@/components/PageShell.vue';
import ThemeLivePreview from '@/components/ThemeLivePreview.vue';
import ThemeShareSheet from '@/components/ThemeShareSheet.vue';
import { notify, notifySuccess } from '@/services/feedback';
import {
  goBack,
  goThemeAcquire,
  goThemeEvent,
  goThemeMember,
  ROUTES,
} from '@/services/navigation';
import { isWechatMiniProgram } from '@/services/platform';
import {
  trackThemeApply,
  trackThemeApplyInvalid,
  trackThemeCollect,
  trackThemeGet,
  trackThemeItemDetail,
  trackThemeListScroll,
  trackThemePreview,
  trackThemeUnsupportedEnv,
} from '@/services/themeAnalytics';
import {
  accessActionLabel,
  accessTagClass,
  canLivePreview,
  claimSkin,
  composePreviewOutfit,
  describeAccess,
  getActiveTheme,
  getDressGroup,
  getLocalDressMap,
  getOverlayLocalDress,
  isFavorited,
  listDressItems,
  persistLocalDress,
  socialStats,
  THEME_ACCESS_FOOTER,
  THEME_PREVIEW_FOOTER,
  THEME_SOCIAL_FOOTER,
  THEME_SORTS,
  toggleFavorite,
  toggleLike,
} from '@/services/themeCenter';
import {
  abortThemePreview,
  beginThemeApply,
  beginThemePreview,
  isThemeSdkSupported,
  THEME_FAULT_TOAST,
} from '@/services/themeFault';
import { themeSharePayload } from '@/utils/themeShare';

export default {
  components: {
    BaseButton, EmptyState, PageShell, ThemeLivePreview, ThemeShareSheet,
  },
  data() {
    return {
      ROUTES,
      groupId: '',
      appliedId: '',
      overlay: getOverlayLocalDress(),
      isMiniProgram: isWechatMiniProgram(),
      detailItem: null,
      shareTarget: null,
      previewOpen: false,
      previewItem: null,
      previewModel: null,
      dressSort: 'newest',
      socialTick: 0,
      sortOptions: THEME_SORTS,
      accessFooter: THEME_ACCESS_FOOTER,
      socialFooter: THEME_SOCIAL_FOOTER,
      previewFooter: THEME_PREVIEW_FOOTER,
      scrollTimer: 0,
      sdkSupported: true,
    };
  },
  computed: {
    group() {
      return getDressGroup(this.groupId);
    },
    items() {
      return listDressItems(this.groupId, this.dressSort);
    },
    hasUpcomingItems() {
      return this.items.some((item) => !item.available);
    },
    blocked() {
      return Boolean(this.group?.mpBlocked && this.isMiniProgram);
    },
    livePreviewModel() {
      return this.previewModel || composePreviewOutfit({
        isMiniProgram: this.isMiniProgram,
      });
    },
  },
  onLoad(options) {
    this.sdkSupported = isThemeSdkSupported();
    this.groupId = options?.group || '';
    if (!getDressGroup(this.groupId)) {
      goBack(ROUTES.themeCenter);
      return;
    }
    this.refresh();
    if (options?.id) {
      const match = this.items.find((item) => item.id === options.id);
      if (match) this.openDetail(match);
    }
  },
  onShow() {
    this.refresh();
  },
  onPageScroll(event) {
    const top = event?.scrollTop || 0;
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      trackThemeListScroll({
        itemIds: this.items.map((item) => item.id),
        scrollTop: top,
        query: { sort: this.dressSort },
      });
    }, 400);
  },
  onShareAppMessage() {
    if (this.shareTarget?.item?.available) {
      return themeSharePayload(this.shareTarget.kind, this.shareTarget.item);
    }
    const live = this.items.find((item) => item.available);
    return live ? themeSharePayload('dress', live) : { title: '', path: '' };
  },
  methods: {
    refresh() {
      this.overlay = getOverlayLocalDress();
      this.appliedId = getLocalDressMap()[this.groupId] || '';
      this.socialTick += 1;
    },
    statsOf(item) {
      return socialStats('dress', item, this.socialTick);
    },
    isItemFav(id) {
      return this.socialTick >= 0 && isFavorited('dress', id);
    },
    onToggleFavorite(item) {
      if (!item?.available) {
        notify({ title: '待上线装扮暂不支持收藏' });
        return;
      }
      const result = toggleFavorite('dress', item);
      this.refresh();
      trackThemeCollect('dress', item, result.favorited);
      notifySuccess(result.favorited ? '已收藏该装扮' : '已取消收藏');
    },
    onToggleLike(item) {
      if (!item?.available) return;
      toggleLike('dress', item);
      this.refresh();
    },
    onShare(item) {
      if (!item?.available) {
        notify({ title: '待上线装扮暂不支持分享' });
        return;
      }
      this.shareTarget = { kind: 'dress', item };
    },
    applyLabel(item) {
      return accessActionLabel(this.dressAccess(item), {
        applied: item.id === this.appliedId,
        kind: 'dress',
      });
    },
    dressAccess(item) {
      return describeAccess(item, 'dress', {
        group: this.group,
        isMiniProgram: this.isMiniProgram,
      });
    },
    tagClass(item) {
      return accessTagClass(item);
    },
    itemActionDisabled(item) {
      const info = this.dressAccess(item);
      if (!this.sdkSupported) return true;
      if (item.id === this.appliedId) return true;
      return info.disabled
        || info.action === 'soon'
        || info.action === 'ended'
        || info.action === 'removed'
        || info.action === 'broken'
        || info.action === 'mp-block';
    },
    itemActionVariant(item) {
      if (this.itemActionDisabled(item)) return 'ghost';
      return 'primary';
    },
    mpHintFor(item) {
      const info = this.dressAccess(item);
      if (this.blocked && info.owned) return '拥有权限，但小程序环境暂不支持该装扮';
      if (this.blocked) return '微信小程序：当前环境不支持该装扮，仅H5可用';
      return '微信小程序：原生导航栏、底部Tab栏受微信限制，该装扮在H5完整生效';
    },
    openDetail(item) {
      this.detailItem = item;
      trackThemeItemDetail('dress', item, this.group);
      trackThemePreview('dress', item, 'detail');
    },
    closeDetail() {
      this.detailItem = null;
    },
    canLivePreviewItem(item) {
      return canLivePreview(item);
    },
    openLivePreview(item) {
      if (!canLivePreview(item)) {
        notify({
          title: item?.eventStatus === 'ended'
            ? '该装扮已绝版，无法再次使用'
            : '装扮素材即将上线',
        });
        return;
      }
      this.previewItem = item;
      beginThemePreview();
      this.previewModel = composePreviewOutfit({
        themeId: getActiveTheme().id,
        extraDress: item,
        isMiniProgram: this.isMiniProgram,
      });
      this.previewOpen = true;
      trackThemePreview('dress', item, 'live');
    },
    closePreview() {
      abortThemePreview();
      this.previewOpen = false;
      this.previewItem = null;
      this.previewModel = null;
    },
    async onConfirmPreview() {
      if (!this.previewItem) {
        this.closePreview();
        return;
      }
      await this.onApply(this.previewItem);
      this.closePreview();
      this.closeDetail();
    },
    async openMemberGate(item) {
      const go = await confirmDialog({
        title: '开通会员',
        content: '该装扮为会员专属，开通会员即可解锁全部会员主题与装扮。开通后可解锁全部会员全局主题、会员局部装扮。',
        confirmText: '开通会员',
        cancelText: '取消',
      });
      if (go) {
        trackThemeGet('dress', item, 'member');
        goThemeMember();
      }
    },
    async onApply(item) {
      const info = this.dressAccess(item);
      if (info.action === 'removed') {
        notify({ title: '装扮已下架' });
        return;
      }
      if (info.action === 'broken') {
        notify({ title: THEME_FAULT_TOAST.resource });
        return;
      }
      if (!this.sdkSupported) {
        notify({ title: THEME_FAULT_TOAST.sdk });
        return;
      }
      if (info.action === 'soon') {
        trackThemeApplyInvalid('dress', item, '已下架');
        notify({ title: '装扮素材即将上线' });
        return;
      }
      if (info.action === 'ended') {
        trackThemeApplyInvalid('dress', item, '已绝版');
        notify({ title: '该限定装扮活动已结束，无法获取' });
        return;
      }
      if (info.action === 'member') {
        trackThemeApply({
          kind: 'dress',
          item,
          result: 'no_permission',
          permission: 'member',
        });
        await this.openMemberGate(item);
        return;
      }
      if (info.action === 'event') {
        trackThemeApply({
          kind: 'dress',
          item,
          result: 'no_permission',
          permission: 'event',
        });
        trackThemeGet('dress', item, 'event');
        goThemeEvent({ id: item.id, kind: 'dress' });
        return;
      }
      if (info.action === 'creator-lock') {
        trackThemeApply({
          kind: 'dress',
          item,
          result: 'no_permission',
          permission: 'creator',
        });
        trackThemeGet('dress', item, 'creator');
        notify({ title: '暂未满足解锁条件，请完成方言创作任务' });
        goThemeAcquire({ focus: 'creator' });
        return;
      }
      if (info.action === 'claim') {
        claimSkin('dress', item.id);
        trackThemeGet('dress', item, item.access);
        this.refresh();
        notifySuccess('恭喜，已获得该装扮，可前往我的装扮使用');
        return;
      }
      if (this.blocked) {
        trackThemeUnsupportedEnv('dress', item);
        trackThemeApply({
          kind: 'dress',
          item,
          result: 'unsupported_env',
        });
        notify({
          title: info.owned
            ? '拥有权限，但小程序环境暂不支持该装扮'
            : '当前小程序环境暂不支持该装扮',
        });
        return;
      }
      if (item.id === this.appliedId) return;
      if (!beginThemeApply(`dress:${item.id}`).ok) return;
      const result = persistLocalDress(this.groupId, item.id);
      if (!result.ok) {
        if (result.reason === 'quota') {
          notify({ title: THEME_FAULT_TOAST.quota });
          return;
        }
        notify({ title: '装扮素材即将上线' });
        return;
      }
      if (result.persisted === false) {
        notify({ title: THEME_FAULT_TOAST.quota });
      }
      trackThemeApply({ kind: 'dress', item, result: 'success' });
      this.refresh();
      this.closeDetail();
      notifySuccess('装扮已生效');
    },
  },
};
</script>

<style scoped>
.lead,
.item-card {
  margin-top: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
}

.item-card {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.item-card.placeholder {
  opacity: 0.84;
}

.item-body {
  min-width: 0;
  flex: 1;
}

.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.theme-action-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.chip {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: var(--font-size-xs);
}

.chip.active {
  border-color: var(--accent-color);
  background: var(--accent-subtle-color);
  color: var(--accent-color);
}

.icon-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
  color: var(--muted-color);
  font-size: var(--font-size-sm);
  line-height: 48rpx;
  text-align: center;
}

.icon-btn.on {
  color: var(--warning-color);
  background: var(--accent-subtle-color);
}

.icon-btn.disabled {
  opacity: 0.4;
}

.sheet-tools {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 2;
  display: flex;
  gap: var(--space-1);
}

.social-stats {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.item-name {
  margin-top: var(--space-2);
  font-weight: 700;
}

.muted,
.warn {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.muted {
  color: var(--muted-color);
}

.warn,
.applied-mark {
  margin-top: var(--space-1);
  color: var(--text-secondary-color);
  font-size: var(--font-size-xs);
}

.tag {
  display: inline-block;
  margin-top: var(--space-2);
  flex-shrink: 0;
  padding: 0 var(--space-1);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  line-height: 36rpx;
}

.tag-free {
  background: var(--accent-subtle-color);
  color: var(--accent-color);
}

.tag-soon {
  background: var(--surface-subtle-color);
  color: var(--muted-color);
}

.tag-member,
.tag-event,
.tag-creator {
  background: var(--accent-subtle-color);
  color: var(--accent-color);
}

.tag-ended {
  background: var(--surface-subtle-color);
  color: var(--text-secondary-color);
}

.item-action,
.foot-note {
  margin-top: var(--space-2);
}

.foot-note {
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  line-height: 1.6;
}

.shot-wrap {
  position: relative;
  flex-shrink: 0;
}

.preview-corner {
  position: absolute;
  right: var(--space-1);
  bottom: var(--space-1);
  z-index: 2;
  max-width: 90%;
  padding: 0 var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--surface-color);
  color: var(--warning-color);
  font-size: var(--font-size-xs);
  line-height: 36rpx;
}

.thumb {
  width: 128rpx;
  height: 128rpx;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--page-color);
  box-sizing: border-box;
}

.thumb-lg {
  width: 100%;
  height: 240rpx;
}

.thumb.blurred {
  filter: blur(6px);
  opacity: 0.7;
}

.soon-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--surface-color);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  line-height: 44rpx;
  transform: translate(-50%, -50%);
}

.thumb-bar,
.thumb-card {
  border-radius: var(--radius-sm);
  background: var(--accent-color);
}

.thumb-bar {
  height: 18rpx;
}

.thumb-card {
  height: 36rpx;
  margin-top: var(--space-1);
  background: var(--surface-color);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.thumb-navbar .thumb-bar,
.thumb-tabbar .thumb-bar {
  height: 28rpx;
}

.thumb-tabbar {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.thumb-actions .thumb-card {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--radius-pill);
  background: var(--accent-color);
}

.thumb-profile {
  background: var(--accent-subtle-color);
}

.thumb-avatar .thumb-card {
  width: 56rpx;
  height: 56rpx;
  margin: 20rpx auto 0;
  border-radius: var(--radius-pill);
  box-shadow: 0 0 0 4rpx var(--gilt-color);
}

.thumb-comment .thumb-card {
  width: 72%;
  height: 44rpx;
  border-radius: var(--radius-md);
}

.thumb-topic .thumb-bar {
  width: 40%;
}

.thumb-chrome .thumb-card {
  height: 28rpx;
  margin-top: var(--space-3);
}

.sheet-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  box-sizing: border-box;
}

.sheet-mask-dim {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--text-color);
  opacity: 0.46;
}

.sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-height: 80vh;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--surface-color);
  box-sizing: border-box;
  overflow: auto;
}

.hint-row {
  margin-top: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--accent-subtle-color);
  color: var(--accent-color);
  font-size: var(--font-size-xs);
  line-height: 1.55;
}

.hint-row.warn {
  background: var(--surface-subtle-color);
  color: var(--text-secondary-color);
}

.sheet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.sheet-actions .base-button {
  flex: 1;
}

.empty-wrap {
  margin-top: var(--space-3);
}

.pressable {
  transition: opacity 200ms ease, transform 200ms ease;
}

.pressable:active {
  opacity: 0.72;
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .pressable {
    transition: none;
  }

  .pressable:active {
    transform: none;
  }
}
</style>
