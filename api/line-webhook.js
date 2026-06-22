// LINE Webhook 受け口
// セットアップ（グループID取得）は完了したため、現在は何も返信しない。
// 通知はアプリ側からの Push（/api/line-push）のみで行う。
// LINEは即時200を期待するため、ここでは常に200を返すだけにする。

module.exports = async (req, res) => {
  // 受信イベントには一切返信しない（通知のみ運用）
  res.status(200).send('OK');
};
