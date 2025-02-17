//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
} from 'vue'
import { useBrowserLocation } from '@vueuse/core'

import { useApi } from '@/composables/useApi'

import { hash } from '@/utils/crypto'

import {
  get,
  isEmpty,
  camelCase,
} from '@/lodash'

const wellKnownConditions = {
  APIServerAvailable: {
    name: 'API Server',
    shortName: 'API',
    description: 'Indicates whether the shoot\'s kube-apiserver is healthy and available. If this is in error state then no interaction with the cluster is possible. The workload running on the cluster is most likely not affected.',
    sortOrder: '0',
  },
  ControlPlaneHealthy: {
    name: 'Control Plane',
    shortName: 'CP',
    description: 'Indicates whether all control plane components are up and running.',
    showAdminOnly: true,
    sortOrder: '1',
  },
  EveryNodeReady: {
    name: 'Nodes',
    shortName: 'N',
    description: 'Indicates whether all nodes registered to the cluster are healthy and up-to-date. If this is in error state there then there is probably an issue with the cluster nodes. In worst case there is currently not enough capacity to schedule all the workloads/pods running in the cluster and that might cause a service disruption of your applications.',
    sortOrder: '3',
  },
  SystemComponentsHealthy: {
    name: 'System Components',
    shortName: 'SC',
    description: 'Indicates whether all system components in the kube-system namespace are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.',
    sortOrder: '2',
  },
  ObservabilityComponentsHealthy: {
    name: 'Observability Components',
    shortName: 'OC',
    description: 'Indicates whether all observability components like Prometheus, Vali, Plutono, etc. are up and running. Gardener manages these system components and should automatically take care that the components become healthy again.',
    sortOrder: '4',
  },
  MaintenancePreconditionsSatisfied: {
    name: 'Maintenance Preconditions Satisfied',
    shortName: 'M',
    description: 'Indicates whether Gardener is able to perform required actions during maintenance. If you do not resolve this issue your cluster will eventually turn into an error state.',
    sortOrder: '5',
  },
  HibernationPossible: {
    name: 'Hibernation Preconditions Satisfied',
    shortName: 'H',
    description: 'Indicates whether Gardener is able to hibernate this cluster. If you do not resolve this issue your hibernation schedule may not have any effect.',
    sortOrder: '6',
  },
}

export function getCondition (type) {
  if (type in wellKnownConditions) {
    return wellKnownConditions[type]
  }

  let name = ''
  let shortName = ''
  const words = type
    .replace(/(Available|Healthy|Ready|Availability)$/, '')
    // Cannot use lookbehind regex as not supported by all browsers (e.g. Safari)
    // therefore need to do it in two steps
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split before new words
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')// split after uppercase only words
    .split(' ')

  for (const word of words) {
    if (name) {
      name += ' '
    }
    name += word
    shortName += word[0]
  }
  return {
    name,
    shortName,
    sortOrder: shortName,
  }
}

export const useConfigStore = defineStore('config', () => {
  const api = useApi()
  const browserLocation = useBrowserLocation()

  const state = ref(null)

  const isInitial = computed(() => {
    return state.value === null
  })

  const alert = computed(() => {
    return state.value?.alert
  })

  const accessRestriction = computed(() => {
    return state.value?.accessRestriction
  })

  const sla = computed(() => {
    return state.value?.sla
  })

  const costObject = computed(() => {
    return state.value?.costObject
  })

  const features = computed(() => {
    return state.value?.features
  })

  const grantTypes = computed(() => {
    return state.value?.grantTypes ?? ['auto', 'authcode', 'device-code']
  })

  const knownConditions = computed(() => {
    return state.value?.knownConditions
  })

  const resourceQuotaHelp = computed(() => {
    return state.value?.resourceQuotaHelp
  })

  const controlPlaneHighAvailabilityHelp = computed(() => {
    return state.value?.controlPlaneHighAvailabilityHelp
  })

  const defaultHibernationSchedule = computed(() => {
    return state.value?.defaultHibernationSchedule
  })

  const themes = computed(() => {
    return state.value?.themes
  })

  const terminal = computed(() => {
    return state.value?.terminal
  })

  const terminalShortcuts = computed(() => {
    return terminal.value?.shortcuts
  })

  const ticket = computed(() => {
    return state.value?.ticket
  })

  const vendorHints = computed(() => {
    return state.value?.vendorHints ?? []
  })

  const helpMenuItems = computed(() => {
    return state.value?.helpMenuItems ?? []
  })

  const externalTools = computed(() => {
    return state.value?.externalTools ?? []
  })

  const defaultNodesCIDR = computed(() => {
    return state.value?.defaultNodesCIDR ?? '10.250.0.0/16'
  })

  const apiServerUrl = computed(() => {
    return state.value?.apiServerUrl ?? browserLocation.value.origin
  })

  const clusterIdentity = computed(() => {
    return state.value?.clusterIdentity
  })

  const seedCandidateDeterminationStrategy = computed(() => {
    return state.value?.seedCandidateDeterminationStrategy
  })

  const serviceAccountDefaultTokenExpiration = computed(() => {
    return state.value?.serviceAccountDefaultTokenExpiration ?? 0
  })

  const isTerminalEnabled = computed(() => {
    return features.value?.terminalEnabled === true
  })

  const isProjectTerminalShortcutsEnabled = computed(() => {
    return features.value?.projectTerminalShortcutsEnabled === true
  })

  const alertBannerMessage = computed(() => {
    return alert.value?.message
  })

  const alertBannerType = computed(() => {
    return alert.value?.type ?? 'error'
  })

  const alertBannerIdentifier = computed(() => {
    if (!alertBannerMessage.value) {
      return
    }
    let identifier = alert.value?.identifier
    if (identifier) {
      identifier = camelCase(identifier)
    } else {
      identifier = hash(alertBannerMessage.value)
    }
    // we prefix the identifier coming from the configuration so that they do not clash with our internal identifiers (e.g. for the shoot editor warning)
    return `cfg.${identifier}`
  })

  const costObjectSettings = computed(() => {
    const costObject = state.value?.costObject
    if (!costObject) {
      return undefined
    }

    const title = costObject.title || ''
    const description = costObject.description || ''
    const regex = costObject.regex
    const errorMessage = costObject.errorMessage

    return {
      regex,
      title,
      description,
      errorMessage,
    }
  })

  const appVersion = computed(() => {
    return state.value?.appVersion ?? import.meta.env.VITE_APP_VERSION
  })

  const resourceQuotaHelpText = computed(() => {
    return resourceQuotaHelp.value?.text
  })

  const controlPlaneHighAvailabilityHelpText = computed(() => {
    return controlPlaneHighAvailabilityHelp.value?.text
  })

  async function fetchConfig () {
    const response = await api.getConfiguration()
    state.value = response.data
  }

  async function $reset () {
    state.value = null
  }

  function purposeRequiresHibernationSchedule (purpose) {
    if (defaultHibernationSchedule.value) {
      if (!purpose) {
        return true
      }
      return !!defaultHibernationSchedule.value[purpose]
    }
    return false
  }

  function isShootHasNoHibernationScheduleWarning (shoot) {
    const purpose = get(shoot, 'spec.purpose')
    const annotations = get(shoot, 'metadata.annotations', {})
    if (purposeRequiresHibernationSchedule(purpose)) {
      const hasNoScheduleFlag = !!annotations['dashboard.garden.sapcloud.io/no-hibernation-schedule']
      if (!hasNoScheduleFlag && isEmpty(get(shoot, 'spec.hibernation.schedules'))) {
        return true
      }
    }
    return false
  }

  function conditionForType (type) {
    return get(knownConditions.value, type, getCondition(type))
  }

  const nodesCIDR = defaultNodesCIDR // TODO: remove one later

  return {
    isInitial,
    appVersion,
    alert,
    accessRestriction,
    sla,
    costObject,
    features,
    grantTypes,
    knownConditions,
    resourceQuotaHelp,
    resourceQuotaHelpText,
    controlPlaneHighAvailabilityHelp,
    controlPlaneHighAvailabilityHelpText,
    defaultHibernationSchedule,
    themes,
    terminal,
    terminalShortcuts,
    ticket,
    vendorHints,
    helpMenuItems,
    externalTools,
    defaultNodesCIDR,
    nodesCIDR,
    apiServerUrl,
    clusterIdentity,
    seedCandidateDeterminationStrategy,
    serviceAccountDefaultTokenExpiration,
    isTerminalEnabled,
    isProjectTerminalShortcutsEnabled,
    alertBannerMessage,
    alertBannerType,
    alertBannerIdentifier,
    costObjectSettings,
    purposeRequiresHibernationSchedule,
    isShootHasNoHibernationScheduleWarning,
    fetchConfig,
    conditionForType,
    $reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConfigStore, import.meta.hot))
}
