const auth = require('../auth.json');
const slack = require('slack');

module.exports.send = function (message, ...threadMessage) {
  if (auth.slack.enabled) {
    return _send(message, ...threadMessage);
  }
};

async function _send(message, ...threadMessage) {
  const slackBot = new slack(auth.slack.token);
  await slackBot.conversations.join({
    token: auth.slack.token,
    channel: auth.slack.channel_id,
  });
  const messagesResponse = await slackBot.chat.postMessage({
    token: auth.slack.token,
    channel: auth.slack.channel_id,
    text: message,
  });

  if (threadMessage) {
    threadMessage.forEach((tMsg) => {
      slackBot.chat.postMessage({
        token: auth.slack.token,
        channel: auth.slack.channel_id,
        thread_ts: messagesResponse.ts,
        reply_broadcast: auth.slack.boradcast_threads,
        text: tMsg,
      });
    });
  }
}
