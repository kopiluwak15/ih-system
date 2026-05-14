/**
 * 要約ページ（タイムラインビュー）
 */

const SummaryPage = {
  render() {
    const summaries = Storage.getSummaries();
    const timeline = document.getElementById('summaryTimeline');

    if (summaries.length === 0) {
      timeline.innerHTML = '<p style="color: #999; text-align: center; padding: 32px;">まだ要約がありません。「独り言」ページで「ここまで要約」をクリックしてください。</p>';
      return;
    }

    // 時系列で逆順に並べ直す（最新が上）
    const sortedSummaries = summaries.slice().reverse();

    timeline.innerHTML = sortedSummaries
      .map((summary, index) => {
        const date = new Date(summary.timestamp);
        const timeStr = date.toLocaleString('ja-JP');
        const sequenceNumber = summaries.length - index;

        return `
          <div class="summary-item">
            <div class="summary-time">【${sequenceNumber}回目の要約】${timeStr}</div>

            <div style="margin-top: 12px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong>課題定義</strong>
              </div>
              <div style="padding: 8px 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 13px; color: #333; line-height: 1.6;">
                ${summary.definition || '（未入力）'}
              </div>
            </div>

            ${summary.hypothesis ? `
            <div style="margin-top: 12px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong>仮説・根拠</strong>
              </div>
              <div style="padding: 8px 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 13px; color: #333; line-height: 1.6;">
                ${summary.hypothesis}
              </div>
            </div>
            ` : ''}

            ${summary.solutions ? `
            <div style="margin-top: 12px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong>解決策の候補</strong>
              </div>
              <div style="padding: 8px 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 13px; color: #333; line-height: 1.6;">
                ${summary.solutions}
              </div>
            </div>
            ` : ''}

            ${summary.roadmap ? `
            <div style="margin-top: 12px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong>ロードマップ・期間</strong>
              </div>
              <div style="padding: 8px 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 13px; color: #333; line-height: 1.6;">
                ${summary.roadmap}
              </div>
            </div>
            ` : ''}
          </div>
        `;
      })
      .join('');
  }
};
