export function evaluateGroupPhotoConflict(post, askedBeforePosting) {
  if (!post || post.status !== 'POSTED' || post.deleted) return null;
  if (!askedBeforePosting) return 'no_ask';
  return post.audience === 'PUBLIC' ? 'public_preference' : null;
}
