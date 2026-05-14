/**
 * 課題管理ページ（ツリービュー）
 */

const IssuesPage = {
  render() {
    const issues = Storage.getIssues();
    const tree = document.getElementById('issuesTree');
    const form = document.getElementById('addIssueBtn');

    // ツリーをレンダリング
    if (issues.length === 0) {
      tree.innerHTML = '<p style="color: #999; text-align: center; padding: 32px;">まだ課題がありません。「独り言」ページで「課題として保存」をクリックしてください。</p>';
    } else {
      tree.innerHTML = this.renderIssueTree(issues);
    }

    // フォームのボタンイベント
    if (form) {
      form.onclick = () => this.addNewIssue();
    }
  },

  renderIssueTree(issues) {
    // 親なし（parentId: null）の課題だけを最上位に表示
    const topLevelIssues = issues.filter(i => !i.parentId);

    return topLevelIssues
      .map(issue => this.renderIssueNode(issue, issues))
      .join('');
  },

  renderIssueNode(issue, allIssues) {
    // 子課題を取得
    const childIssues = allIssues.filter(i => i.parentId === issue.id);

    const progressPercent = issue.progress || 0;
    const createdDate = new Date(issue.createdAt).toLocaleDateString('ja-JP');

    let html = `
      <div class="tree-node" data-issue-id="${issue.id}">
        <div class="tree-node-title">${issue.title}</div>
        <div class="tree-node-info">
          <span>作成: ${createdDate}</span>
          <span>${progressPercent}% 完了</span>
        </div>
    `;

    // 解決策が入力されている場合は表示
    if (issue.solution) {
      html += `
        <div style="margin-top: 8px; font-size: 12px; color: #666; padding: 8px; background-color: #f9f9f9; border-radius: 4px; border-left: 2px solid #667eea;">
          <strong>解決策:</strong> ${issue.solution}
        </div>
      `;
    }

    // 期間が入力されている場合
    if (issue.duration) {
      html += `
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          期間: ${issue.duration}日間
        </div>
      `;
    }

    // プログレスバー
    html += `
      <div class="progress-bar" style="margin-top: 8px;">
        <div class="progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
    `;

    // 子課題がある場合は表示
    if (childIssues.length > 0) {
      html += '<div style="margin-left: 16px; margin-top: 12px; border-left: 2px solid #e0e0e0; padding-left: 12px;">';
      childIssues.forEach(child => {
        html += this.renderIssueNode(child, allIssues);
      });
      html += '</div>';
    }

    html += `
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button class="btn" style="padding: 6px 12px; font-size: 12px; background-color: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="IssuesPage.editIssue('${issue.id}')">
          編集
        </button>
        <button class="btn" style="padding: 6px 12px; font-size: 12px; background-color: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="IssuesPage.deleteIssue('${issue.id}')">
          削除
        </button>
      </div>
    </div>
    `;

    return html;
  },

  addNewIssue() {
    const title = document.getElementById('newIssueTitle').value.trim();
    const solution = document.getElementById('newIssueSolution').value.trim();
    const duration = parseInt(document.getElementById('newIssueDuration').value) || 0;
    const progress = parseInt(document.getElementById('newIssueProgress').value) || 0;

    if (!title) {
      alert('課題のタイトルを入力してください');
      return;
    }

    // 課題を追加
    const issue = Storage.addIssue({
      title: title,
      solution: solution,
      duration: duration,
      progress: progress
    });

    // フォームをリセット
    document.getElementById('newIssueTitle').value = '';
    document.getElementById('newIssueSolution').value = '';
    document.getElementById('newIssueDuration').value = '';
    document.getElementById('newIssueProgress').value = '';

    // 再度レンダリング
    this.render();
  },

  editIssue(issueId) {
    const issues = Storage.getIssues();
    const issue = issues.find(i => i.id === issueId);

    if (!issue) return;

    // プロンプトで編集内容を入力（簡易版）
    const newTitle = prompt('課題のタイトル:', issue.title);
    if (newTitle === null) return;

    const newProgress = prompt('進捗（%）:', issue.progress);
    if (newProgress === null) return;

    Storage.updateIssue(issueId, {
      title: newTitle.trim(),
      progress: parseInt(newProgress) || 0
    });

    this.render();
  },

  deleteIssue(issueId) {
    if (!confirm('この課題を削除しますか？')) return;

    Storage.deleteIssue(issueId);
    this.render();
  }
};
