<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    :vendor="vendor"
    :create-title="`Add new ${name} Secret`"
    :replace-title="`Replace ${name} Secret`"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          ref="accessKeyId"
          v-model="accessKeyId"
          color="primary"
          label="Access Key Id"
          :error-messages="getErrorMessages('accessKeyId')"
          counter="128"
          hint="e.g. QNJebZ17v5Q7pYpP"
          variant="underlined"
          @update:model-value="v$.accessKeyId.$touch()"
          @blur="v$.accessKeyId.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="accessKeySecret"
          color="primary"
          label="Access Key Secret"
          :error-messages="getErrorMessages('accessKeySecret')"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          counter="30"
          hint="e.g. WJalrXUtnFEMIK7MDENG/bPxRfiCYz"
          variant="underlined"
          @click:append="() => (hideSecret = !hideSecret)"
          @update:model-value="v$.accessKeySecret.$touch()"
          @blur="v$.accessKeySecret.$touch()"
        />
      </div>
    </template>
    <template #help-slot>
      <div v-if="vendor==='alicloud'">
        <p>
          Before you can provision and access a Kubernetes cluster on Alibaba Cloud, you need to add account credentials. To manage
          credentials for Alibaba Cloud Resource Access Management (RAM), use the
          <g-external-link url="https://ram.console.aliyun.com/overview">
            RAM Console
          </g-external-link>.
          The Gardener needs the credentials to provision and operate the Alibaba Cloud infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Gardener uses encrypted system disk when creating Shoot, please enable ECS disk encryption on Alibaba Cloud Console
          (<g-external-link url="https://www.alibabacloud.com/help/doc-detail/59643.htm">
            official
            documentation
          </g-external-link>).
        </p>
        <p>
          Copy the Alibaba Cloud RAM policy document below and attach it to the RAM user
          (<g-external-link url="https://www.alibabacloud.com/help/product/28625.htm?spm=a3c0i.100866.1204872.1.79461e4eLtFABp">
            official
            documentation
          </g-external-link>). Alternatively, you can assign following permissions to the RAM
          user: AliyunECSFullAccess, AliyunSLBFullAccess, AliyunVPCFullAccess, AliyunEIPFullAccess, AliyunNATGatewayFullAccess.
        </p>
        <g-code-block
          height="100%"
          lang="json"
          :content="JSON.stringify(template, undefined, 2)"
        />
      </div>
      <div v-if="vendor==='alicloud-dns'">
        <p>
          You need to provide an access key (access key ID and secret access key) for Alibaba Cloud to allow the dns-controller-manager to authenticate to Alibaba Cloud DNS.
        </p>
        <p>
          For details see <g-external-link url="https://github.com/aliyun/alibaba-cloud-sdk-go/blob/master/docs/2-Client-EN.md#accesskey-client">
            AccessKey Client
          </g-external-link>. Currently the regionId is fixed to cn-shanghai.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  minLength,
  maxLength,
} from '@vuelidate/validators'

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GCodeBlock from '@/components/GCodeBlock'
import GExternalLink from '@/components/GExternalLink'

import {
  getValidationErrors,
  setDelayedInputFocus,
} from '@/utils'

const validationErrors = {
  accessKeyId: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 16 characters.',
    maxLength: 'It exceeds the maximum length of 128 characters.',
  },
  accessKeySecret: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 30 characters.',
  },
}

export default {
  components: {
    GSecretDialog,
    GCodeBlock,
    GExternalLink,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secret: {
      type: Object,
    },
    vendor: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      accessKeyId: undefined,
      accessKeySecret: undefined,
      hideSecret: true,
      validationErrors,
      template: {
        Statement: [
          {
            Action: 'vpc:*',
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'ecs:*',
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'slb:*',
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: [
              'ram:GetRole',
              'ram:CreateRole',
              'ram:CreateServiceLinkedRole',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'ros:*',
            Effect: 'Allow',
            Resource: '*',
          },
        ],
        Version: '1',
      },
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    valid () {
      return !this.v$.$invalid
    },
    name () {
      if (this.vendor === 'alicloud') {
        return 'Alibaba Cloud'
      }
      if (this.vendor === 'alicloud-dns') {
        return 'Alicloud DNS'
      }
      return undefined
    },
    secretData () {
      return {
        accessKeyID: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
      }
    },
    validators () {
      const validators = {
        accessKeyId: {
          required,
          minLength: minLength(16),
          maxLength: maxLength(128),
        },
        accessKeySecret: {
          required,
          minLength: minLength(30),
        },
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    },
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    },
  },
  methods: {
    reset () {
      this.v$.$reset()

      this.accessKeyId = ''
      this.accessKeySecret = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'accessKeyId')
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
  },
}
</script>
