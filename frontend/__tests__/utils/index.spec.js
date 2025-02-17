//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  canI,
  selectedImageIsNotLatest,
  isHtmlColorCode,
  defaultCriNameByKubernetesVersion,
  getIssueSince,
} from '@/utils'

import { pick } from '@/lodash'

describe('utils', () => {
  describe('authorization', () => {
    describe('#canI', () => {
      let rulesReview

      beforeEach(() => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group1'],
            resources: ['resource1'],
          },
          {
            verbs: ['get'],
            apiGroups: ['group2'],
            resources: ['resource2'],
            resourceNames: [
              'resourceName2',
            ],
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3'],
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3'],
            resourceNames: [
              'resourceName3',
              'resourceName4',
            ],
          }],
        }
      })

      it('should validate', () => {
        expect(canI(rulesReview, 'get', 'group1', 'resource1')).toBe(true)
        expect(canI(rulesReview, 'get', 'group1', 'resource1', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group1', 'resource1')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource1')).toBe(false)
        expect(canI(rulesReview, 'get', 'group1', 'foo')).toBe(false)
        expect(canI(rulesReview, 'get', 'group1', 'resource3')).toBe(false)
        expect(canI(rulesReview, 'foo', 'bar', 'baz')).toBe(false)
      })

      it('should validate for resourceName', () => {
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'resourceName2')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName3')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'get', 'group2', 'resource2')).toBe(false)
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'foo')).toBe(false)
        expect(canI(rulesReview, 'foo', 'group2', 'resource2', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource2', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'get', 'group2', 'foo', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'foo', 'bar', 'baz', 'resourceName2')).toBe(false)
      })

      it('should validate with wildcard verb', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['*'],
            apiGroups: ['group4'],
            resources: ['resource4'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'list', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, '*', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should validate with wildcard apiGroup', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['*'],
            resources: ['resource4'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', '*', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should validate with wildcard resource', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['*'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', '*')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
      })

      it('should validate with wildcard resource name', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['resource4'],
            resourceName: ['*'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should not fail to validate rulesReview', () => {
        expect(canI(undefined, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({}, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({ resourceRules: [] }, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({
          resourceRules: [{
            verbs: [],
            apiGroups: [],
            resources: [],
          }],
        }, 'get', 'group1', 'resource1')).toBe(false)
      })
    })
  })

  describe('defaultCriNameByKubernetesVersion', () => {
    it('should return docker for k8s < 1.22.0', () => {
      expect(defaultCriNameByKubernetesVersion(['cri1', 'docker', 'containerd', 'cri2'], '1.21.3')).toBe('docker')
    })

    it('should return containerd for k8s >= 1.22.0', () => {
      expect(defaultCriNameByKubernetesVersion(['cri1', 'docker', 'containerd', 'cri2'], '1.22.0')).toBe('containerd')
    })

    it('should return first cri as fallback', () => {
      expect(defaultCriNameByKubernetesVersion(['cri1', 'cri2'], '1.21.3')).toBe('cri1')
      expect(defaultCriNameByKubernetesVersion(['cri1', 'cri2'], '1.22.0')).toBe('cri1')
    })
  })

  describe('#selectedImageIsNotLatest', () => {
    const sampleMachineImages = [
      {
        name: 'FooImage',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.1.1',
        expirationDate: '2119-04-05T01:02:03Z', // not expired
        isSupported: true,
      },
      {
        name: 'FooImage2',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.2.2',
        isSupported: true,
      },
      {
        name: 'FooImage3',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.2',
        isSupported: true,
      },
      {
        name: 'FooImage4',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.3',
        expirationDate: '2119-04-05T01:02:03Z', // not expired
        isPreview: true,
      },
      {
        name: 'BarImage',
        vendorName: 'Bar',
        icon: 'icon',
        version: '3.3.2',
        isSupported: true,
        expirationDate: '2019-04-05T01:02:03Z', // expired
      },
      {
        name: 'FooImage5',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.4',
        isDeprecated: true,
      },
      {
        name: 'FooImage6',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.4.4',
        isPreview: true,
      },
    ]

    it('selected image should not be be latest (one newer supported exists)', () => {
      const result = selectedImageIsNotLatest(sampleMachineImages[1], sampleMachineImages)
      expect(result).toBe(true)
    })

    it('selected image should be latest (only newer deprecated, preview and other vendor exists)', () => {
      const result = selectedImageIsNotLatest(sampleMachineImages[2], sampleMachineImages)
      expect(result).toBe(false)
    })

    it('selected image should be latest (only one exists)', () => {
      const result = selectedImageIsNotLatest(sampleMachineImages[4], sampleMachineImages)
      expect(result).toBe(false)
    })
  })

  describe('html color code', () => {
    it('should not fail when zero', () => {
      expect(isHtmlColorCode(undefined)).toBe(false)
      expect(isHtmlColorCode(null)).toBe(false)
    })

    it('should return true on html color code', () => {
      expect(isHtmlColorCode('#0b8062')).toBe(true)
      expect(isHtmlColorCode('#FfFfFf')).toBe(true)
    })

    it('should return false on non-html color code', () => {
      expect(isHtmlColorCode('foo')).toBe(false)
    })
  })

  describe('getIssueSince', () => {
    let status

    beforeEach(() => {
      status = {
        lastOperation: {
          state: 'False',
          lastUpdateTime: '2000-01-01T00:00:01Z',
        },
        conditions: [
          {
            status: 'True',
            lastTransitionTime: '2000-01-01T00:00:02Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:03Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:04Z',
          },
        ],
        constraints: [
          {
            status: 'True',
            lastTransitionTime: '2000-01-01T00:00:05Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:06Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:07Z',
          },
        ],
        lastErrors: [
          {
            lastUpdateTime: '2000-01-01T00:00:08Z',
          },
        ],
      }
    })

    it('should not fail when zero', () => {
      expect(getIssueSince()).toBeUndefined()
    })

    it('should return undefined for lastOperation == true', () => {
      status.lastOperation.state = 'True'
      expect(getIssueSince(pick(status, 'lastOperation'))).toBeUndefined()
    })

    it('should return issue since for lastOperation', () => {
      expect(getIssueSince(pick(status, 'lastOperation'))).toBe('2000-01-01T00:00:01Z')
    })

    it('should return issue since for condition', () => {
      expect(getIssueSince(pick(status, 'conditions'))).toBe('2000-01-01T00:00:03Z')
    })

    it('should return issue since for constraint', () => {
      expect(getIssueSince(pick(status, 'constraints'))).toBe('2000-01-01T00:00:06Z')
    })

    it('should return issue since for lastError', () => {
      expect(getIssueSince(pick(status, 'lastErrors'))).toBe('2000-01-01T00:00:08Z')
    })

    it('should return issue since for allIssues', () => {
      expect(getIssueSince(status)).toBe('2000-01-01T00:00:01Z')
    })
  })
})
