import { type App, PluginSettingTab, Setting } from 'obsidian'

import OpenAIModels from '../services/openai/models'

import obfuscateApiKey from '../utils/obfuscateApiKey'

import {
  BOT_HANDLE,
  DEFAULT_MAX_MEMORY_COUNT,
  PLUGIN_NAME,
  PLUGIN_PREFIX,
  USER_HANDLE
} from '../constants'
import { OPEN_AI_API_KEY_URL } from '../services/openai/constants'

import type ObsidianAIResearchAssistant from '../main'
import type { OpenAIModel } from '../services/openai/types'
import AssistantPreamble from 'src/preambles/assistant'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Electron = require('electron')

const {
  remote: { safeStorage }
} = Electron

export default class SettingsTab extends PluginSettingTab {
  plugin: ObsidianAIResearchAssistant

  constructor(app: App, plugin: ObsidianAIResearchAssistant) {
    super(app, plugin)

    this.plugin = plugin
  }

  async resetPluginView(): Promise<void> {
    this.plugin.app.workspace.detachLeavesOfType(PLUGIN_PREFIX)

    await this.plugin.initializeChatService()
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    containerEl.createEl('h2', { text: `${PLUGIN_NAME} Settings` })

    const settingsDescContainer = containerEl.createEl('div')

    settingsDescContainer.createEl('p', {
      text: `${PLUGIN_NAME} is a plugin that facilitates Researchers and Prompt Engineers studying how conversational AIs respond to various prompts. We currently only support OpenAI's API with the following models: gpt-3.5-turbo, text-davinci-003`
    })

    const helpText = settingsDescContainer.createEl('p', {
      text: 'You can get your API Key here: '
    })

    helpText.createEl('a', {
      text: OPEN_AI_API_KEY_URL,
      href: OPEN_AI_API_KEY_URL
    })

    let temporaryOpenAiApiKey = ''

    if (
      typeof this.plugin.settings.openAiApiKey === 'undefined' ||
      this.plugin.settings.openAiApiKey === ''
    ) {
      this.plugin.settings.apiKeySaved = false
    }

    if (!this.plugin.settings.apiKeySaved) {
      const apiKeySetting = new Setting(containerEl)
        .setName('OpenAI API Key')
        .setDesc(
          'Your API Key will be used to make requests when you submit a message in the Chat Window. Changing this value will reset any existing chat windows.'
        )
        .addText((text) =>
          text.setPlaceholder('Set your API key').onChange(async (value) => {
            if (safeStorage.isEncryptionAvailable() === true) {
              temporaryOpenAiApiKey = safeStorage.encryptString(value)
            } else {
              temporaryOpenAiApiKey = value
            }
          })
        )

      apiKeySetting.addButton((button) => {
        button.setButtonText('Save API Key').onClick(async () => {
          this.plugin.settings.openAiApiKey = temporaryOpenAiApiKey
          temporaryOpenAiApiKey = ''

          this.plugin.settings.apiKeySaved = true

          await this.plugin.saveSettings()

          await this.resetPluginView()

          this.display()
        })
      })
    } else {
      console.log(
        'API Key:',
        this.plugin.settings.openAiApiKey,
        typeof this.plugin.settings.openAiApiKey
      )

      const apiKeySetting = new Setting(containerEl)
        .setName('OpenAI API Key')
        .setDesc(
          'Your API Key will be used to make requests when you submit a message in the Chat Window. Changing this value will reset any existing chat windows.'
        )
        .addText((text) => {
          let apiKey = this.plugin.settings.openAiApiKey

          if (safeStorage.isEncryptionAvailable() === true) {
            apiKey = safeStorage.decryptString(Buffer.from(apiKey))
          }

          text.setPlaceholder(obfuscateApiKey(apiKey))
        })
        .setDisabled(true)

      apiKeySetting.addButton((button) => {
        button.setButtonText('Remove API Key').onClick(async () => {
          console.log('removing api key...')

          this.plugin.settings.openAiApiKey = ''

          this.plugin.settings.apiKeySaved = false

          await this.plugin.saveSettings()

          await this.resetPluginView()

          this.display()
        })
      })
    }

    new Setting(containerEl)
      .setName('Default Model')
      .setDesc(
        `The default model to use when sending a message. Changing this value will reset any existing chat windows.`
      )
      .addDropdown((dropdown) => {
        Object.keys(OpenAIModels).forEach((model) => {
          dropdown.addOption(model, model)
        })

        dropdown.setValue(this.plugin.settings.defaultModel)

        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultModel = value as OpenAIModel

          await this.plugin.saveSettings()

          await this.resetPluginView()
        })
      })
      .setDisabled(true)

    new Setting(containerEl)
      .setName('Default Preamble')
      .setDesc(
        `The default preamble to use when starting a Conversation. You can edit the Preamble in the Chat interface. Changing this value will reset any existing chat windows.`
      )
      .setClass('ai-research-assistant__settings__preamble')
      .addTextArea((text) =>
        text
          .setPlaceholder(AssistantPreamble())
          .setValue(this.plugin.settings.defaultPreamble ?? '')
          .onChange(async (value) => {
            this.plugin.settings.defaultPreamble = value

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    new Setting(containerEl)
      .setName('Maximum Memory Count')
      .setDesc(
        `The number of messages that should be stored in conversation memory. Set to 0 for no limit.
          
          Note: Core Memories will always be included, but if there are more Core Memories than this limit, no other memories will be included.`
      )
      .addSlider((slider) => {
        slider
          .setDynamicTooltip()
          .setLimits(0, 20, 1)
          .setValue(
            this.plugin.settings.maxMemoryCount ?? DEFAULT_MAX_MEMORY_COUNT
          )
          .onChange(async (value) => {
            this.plugin.settings.maxMemoryCount = value

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      })

    // create Setting text input for user prefix
    new Setting(containerEl)
      .setName('Default User Handle')
      .setDesc(
        'The handle to use when displaying a user message. Changing this value will reset any existing chat windows.'
      )
      .addText((text) =>
        text
          .setPlaceholder(USER_HANDLE)
          .setValue(this.plugin.settings.userHandle)
          .onChange(async (value) => {
            this.plugin.settings.userHandle = value

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    // create Setting text input for bot prefix
    new Setting(containerEl)
      .setName('Default Bot Handle')
      .setDesc(
        'The handle to use when displaying a bot message. Changing this value will reset any existing chat windows.'
      )
      .addText((text) =>
        text
          .setPlaceholder(BOT_HANDLE)
          .setValue(this.plugin.settings.botHandle)
          .onChange(async (value) => {
            this.plugin.settings.botHandle = value

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    new Setting(containerEl)
      .setName('Conversation Directory')
      .setDesc('Where to save conversations.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.conversationHistoryDirectory)
          .onChange(async (value) => {
            this.plugin.settings.conversationHistoryDirectory = value

            await this.plugin.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName('Autosave Conversations')
      .setDesc(
        `Automatically save conversations to your Vault. You will need to close any open the Chat windows for this change to take effect.`
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autosaveConversationHistory)

        toggle.onChange(async (value) => {
          this.plugin.settings.autosaveConversationHistory = value

          await this.plugin.saveSettings()

          this.display()
        })
      })

    if (this.plugin.settings.autosaveConversationHistory) {
      new Setting(containerEl)
        .setName('Autosave Interval')
        .setDesc(
          `How many seconds should pass before a conversation is automatically saved to your Vault. You will need to close any open the Chat windows for this change to take effect.`
        )
        .addText((text) => {
          text.setValue(`${this.plugin.settings.autosaveInterval}`)

          text.onChange(async (value) => {
            const number = Number(value)
            this.plugin.settings.autosaveInterval = !Number.isNaN(value)
              ? number
              : 15

            await this.plugin.saveSettings()
          })
        })
    }
  }
}
