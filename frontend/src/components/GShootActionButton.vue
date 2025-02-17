<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-tooltip
    location="top"
    :disabled="tooltipDisabled"
    :text="tooltipText"
    max-width="600px"
    class="g-action-button"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="mergeProps(props, { onClick })"
        variant="text"
        :density="isTextBtn ? 'default' : 'comfortable'"
        :disabled="isShootMarkedForDeletion || isShootActionsDisabledForPurpose || disabled"
        :loading="loading"
        :[iconProp]="icon"
        :color="color"
        :text="text"
        :class="{ 'text-none font-weight-regular justify-start': isTextBtn }"
        :width="isTextBtn ? '100%' : undefined"
      />
    </template>
  </v-tooltip>
</template>

<script>
import { shootItem } from '@/mixins/shootItem'

export default {
  mixins: [shootItem],
  inject: ['mergeProps'],
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: 'mdi-cog-outline',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: 'action-button',
    },
    text: {
      type: String,
    },
    tooltip: {
      type: String,
    },
    caption: {
      type: String,
    },
  },
  emits: ['click'],
  computed: {
    isTextBtn () {
      return !!this.text
    },
    iconProp () {
      return this.isTextBtn ? 'prepend-icon' : 'icon'
    },
    tooltipText () {
      if (this.tooltip) {
        return this.tooltip
      }
      return this.shootActionToolTip(this.caption)
    },
    tooltipDisabled () {
      return this.text === this.tooltipText
    },
  },
  methods: {
    onClick (...args) {
      this.$emit('click', ...args)
    },
  },
}
</script>
