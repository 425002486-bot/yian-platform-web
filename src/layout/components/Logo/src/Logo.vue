<script lang="ts" setup>
import { computed, onMounted, ref, unref, watch } from 'vue'
import { useAppStore } from '@/store/modules/app'
import { useDesign } from '@/hooks/web/useDesign'
import logoMark from '@/assets/imgs/logo.png'
import logoFull from '@/assets/imgs/logo-full.png'
import logoFullWhiteSidebar from '@/assets/imgs/logo-full-white-sidebar.png'

defineOptions({ name: 'Logo' })

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('logo')

const appStore = useAppStore()

const show = ref(true)

const layout = computed(() => appStore.getLayout)

const collapse = computed(() => appStore.getCollapse)

const isClassicSidebar = computed(() => layout.value === 'classic')

const fullLogoSrc = computed(() => {
  if (isClassicSidebar.value) {
    return logoFullWhiteSidebar
  }
  return logoFull
})

const linkClass = computed(() =>
  isClassicSidebar.value
    ? 'flex !h-[62px] items-start justify-center cursor-pointer px-8px pt-[14px] relative decoration-none overflow-visible'
    : 'flex !h-[var(--logo-height)] items-center cursor-pointer pl-8px relative decoration-none overflow-hidden'
)

const imgClass = computed(() => {
  if (!show.value) {
    return 'h-[calc(var(--logo-height)-10px)] w-[calc(var(--logo-height)-10px)] object-contain'
  }
  return isClassicSidebar.value
    ? 'h-[50px] w-auto max-w-[204px] object-contain'
    : 'h-[calc(var(--logo-height)-12px)] w-auto max-w-[168px] object-contain'
})

onMounted(() => {
  if (unref(collapse)) show.value = false
})

watch(
  () => collapse.value,
  (collapse: boolean) => {
    if (unref(layout) === 'topLeft' || unref(layout) === 'cutMenu') {
      show.value = true
      return
    }
    if (!collapse) {
      setTimeout(() => {
        show.value = !collapse
      }, 400)
    } else {
      show.value = !collapse
    }
  }
)

watch(
  () => layout.value,
  (layout) => {
    if (layout === 'top' || layout === 'cutMenu') {
      show.value = true
    } else {
      if (unref(collapse)) {
        show.value = false
      } else {
        show.value = true
      }
    }
  }
)
</script>

<template>
  <div>
    <router-link
      :class="[
        prefixCls,
        layout !== 'classic' ? `${prefixCls}__Top` : '',
        linkClass
      ]"
      to="/"
    >
      <img
        :class="imgClass"
        :src="show ? fullLogoSrc : logoMark"
        alt="翼安智链"
      />
    </router-link>
  </div>
</template>
