/**
 * ミーティング管理ページ
 * 緊急ミーティングの履歴・予定を管理
 */

const MeetingPage = {
  render() {
    const meetings = Storage.getMeetings();
    const list = document.getElementById('meetingList');

    if (meetings.length === 0) {
      list.innerHTML = '<p style="color: #999; text-align: center; padding: 32px;">まだミーティングがありません。「独り言」ページで「🚨 緊急ミーティング」をクリックしてください。</p>';
      return;
    }

    // 時系列で逆順に並べ直す（最新が上）
    const sortedMeetings = meetings.slice().reverse();

    list.innerHTML = sortedMeetings
      .map(meeting => {
        const date = new Date(meeting.createdAt);
        const timeStr = date.toLocaleString('ja-JP');

        const scheduledDate = meeting.deadline ? new Date(meeting.deadline).toLocaleDateString('ja-JP') : '未設定';
        const statusDisplay = {
          'pending': '予定中',
          'scheduled': 'スケジュール済み',
          'completed': '完了'
        };
        const statusText = statusDisplay[meeting.status] || meeting.status;

        return `
          <div class="meeting-item">
            <div class="meeting-title">${meeting.title}</div>
            <div class="meeting-info">
              <span>作成: ${timeStr}</span>
              <span>予定日: ${scheduledDate}</span>
              <span>ステータス: ${statusText}</span>
            </div>

            ${meeting.description ? `
            <div style="margin-top: 8px; font-size: 13px; color: #666; line-height: 1.6;">
              ${meeting.description}
            </div>
            ` : ''}

            ${meeting.materials && meeting.materials.length > 0 ? `
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
              <strong>準備資料:</strong> ${meeting.materials.join(', ')}
            </div>
            ` : ''}

            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button class="btn" style="padding: 6px 12px; font-size: 12px; background-color: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="MeetingPage.updateMeetingStatus('${meeting.id}')">
                ステータス更新
              </button>
              <button class="btn" style="padding: 6px 12px; font-size: 12px; background-color: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="MeetingPage.deleteMeeting('${meeting.id}')">
                削除
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  },

  updateMeetingStatus(meetingId) {
    const meetings = Storage.getMeetings();
    const meeting = meetings.find(m => m.id === meetingId);

    if (!meeting) return;

    const statusMap = {
      'pending': 'scheduled',
      'scheduled': 'completed',
      'completed': 'pending'
    };

    const newStatus = statusMap[meeting.status] || 'pending';

    const statusDisplay = {
      'pending': '予定中',
      'scheduled': 'スケジュール済み',
      'completed': '完了'
    };

    Storage.updateMeeting(meetingId, {
      status: newStatus
    });

    this.render();
    alert(`ステータスを「${statusDisplay[newStatus]}」に更新しました`);
  },

  deleteMeeting(meetingId) {
    if (!confirm('このミーティングを削除しますか？')) return;

    const meetings = Storage.getMeetings();
    const filtered = meetings.filter(m => m.id !== meetingId);
    localStorage.setItem(Storage.KEYS.MEETINGS, JSON.stringify(filtered));

    this.render();
  }
};
