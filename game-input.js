'use strict';
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(value);
const validIds=(data,requireTarget=false)=>Boolean(data&&typeof data==='object'&&!Array.isArray(data)&&validId(data.conversationId)&&(data.targetUserId==null?!requireTarget:validId(data.targetUserId)));
module.exports={validId,validIds};
