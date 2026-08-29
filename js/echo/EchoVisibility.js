export function canCharacterSeePost(post,characterId,{friendIds=[]}={}){
  if(!post||post.status!=='POSTED'||post.deleted)return false;
  if(post.audience==='PUBLIC')return true;
  if(post.audience==='FRIENDS')return friendIds.includes(characterId);
  if(post.audience==='SELECTED')return (post.selectedAudience??[]).includes(characterId);
  return false;
}
