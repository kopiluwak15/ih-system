/**
 * 思考分析ページ（思考の変化を可視化）
 * MVP版：基本的な分析機能を提供
 */

const AnalysisPage = {
  render() {
    const summaries = Storage.getSummaries();
    const content = document.getElementById('analysisContent');

    if (summaries.length < 2) {
      content.innerHTML = '<p style="color: #999; text-align: center; padding: 32px;">複数の要約が作成されると、思考の変化が表示されます。</p>';
      return;
    }

    // 2つ以上の要約があれば、分析を表示
    let html = '<div style="padding: 16px;">';

    // 分析1: 課題定義の変化
    html += this.renderDefinitionChange(summaries);

    // 分析2: 解決策候補の追加
    html += this.renderSolutionsChange(summaries);

    // 分析3: タイムラインの全体図
    html += this.renderSummaryCount(summaries);

    html += '</div>';
    content.innerHTML = html;
  },

  renderDefinitionChange(summaries) {
    const sorted = summaries.slice().reverse(); // 最新順

    let html = `
      <div style="margin-bottom: 24px; padding: 16px; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #667eea;">
        <h3 style="margin-top: 0; font-size: 16px; color: #333;">課題定義の変化</h3>
    `;

    sorted.forEach((summary, idx) => {
      const sequenceNumber = sorted.length - idx;
      html += `
        <div style="margin-bottom: 12px; padding: 8px; background-color: white; border-radius: 4px;">
          <div style="font-size: 12px; color: #999; margin-bottom: 4px;">要約 #${sequenceNumber}</div>
          <div style="font-size: 14px; color: #333;">${summary.definition || '（定義なし）'}</div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  },

  renderSolutionsChange(summaries) {
    const sorted = summaries.slice().reverse();

    let html = `
      <div style="margin-bottom: 24px; padding: 16px; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #764ba2;">
        <h3 style="margin-top: 0; font-size: 16px; color: #333;">検討された解決策</h3>
    `;

    const allSolutions = new Set();
    sorted.forEach((summary, idx) => {
      const sequenceNumber = sorted.length - idx;
      if (summary.solutions) {
        html += `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: #999; margin-bottom: 4px; font-weight: 500;">要約 #${sequenceNumber}</div>
            <div style="font-size: 13px; color: #333; padding: 8px; background-color: white; border-radius: 4px; line-height: 1.6;">
              ${summary.solutions}
            </div>
          </div>
        `;
        allSolutions.add(summary.solutions);
      }
    });

    html += `
      <div style="margin-top: 12px; padding: 8px; background-color: #e8f5e9; border-radius: 4px; border-left: 3px solid #4caf50;">
        <div style="font-size: 12px; color: #2e7d32;">
          <strong>計${allSolutions.size}個の解決策が検討されました</strong>
        </div>
      </div>
    `;

    html += '</div>';
    return html;
  },

  renderSummaryCount(summaries) {
    const sorted = summaries.slice();

    let html = `
      <div style="padding: 16px; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #ff9800;">
        <h3 style="margin-top: 0; font-size: 16px; color: #333;">思考の経過</h3>
        <div style="font-size: 14px; color: #333; margin-bottom: 12px;">
          <strong>${sorted.length}回</strong>の要約が作成されました
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
    `;

    sorted.reverse().forEach((summary, idx) => {
      const sequenceNumber = sorted.length - idx;
      const date = new Date(summary.timestamp);
      const timeStr = date.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      html += `
        <div style="padding: 8px 12px; background-color: white; border-radius: 4px; border: 1px solid #e0e0e0; font-size: 12px; color: #666;">
          <span style="font-weight: 500; color: #667eea;">要約 #${sequenceNumber}</span>
          <br>
          ${timeStr}
        </div>
      `;
    });

    html += '</div></div>';
    return html;
  }
};
