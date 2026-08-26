import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/mail', () => ({
  postMail: vi.fn(),
}));

const { default: MailSendPage } = await import('@/pages/mails/send.vue');

describe('mail send recipient', () => {
  it('prefills the recipient from the query id', () => {
    const wrapper = mount(MailSendPage, {
      global: {
        stubs: { 'cu-custom': true },
      },
    });
    wrapper.vm.applyRecipient(9);
    expect(wrapper.vm.Notification.recipients).toEqual(['9']);
  });
});
