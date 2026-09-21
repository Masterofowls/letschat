import {
  normalizeCallMediaType,
  normalizeCallStatus,
  toGraphqlCallMediaType,
} from '../call-enums';

describe('call-enums', () => {
  it('maps GraphQL AUDIO/VIDEO to lowercase UI values', () => {
    expect(normalizeCallMediaType('VIDEO')).toBe('video');
    expect(normalizeCallMediaType('audio')).toBe('audio');
    expect(toGraphqlCallMediaType('video')).toBe('VIDEO');
  });

  it('maps GraphQL call status enums', () => {
    expect(normalizeCallStatus('RINGING')).toBe('ringing');
    expect(normalizeCallStatus('ACTIVE')).toBe('active');
    expect(normalizeCallStatus('ENDED')).toBe('ended');
  });
});
