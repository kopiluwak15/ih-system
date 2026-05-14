/**
 * KPI Tree Templates
 * CEO Dashboard - Phase 3
 *
 * 事前定義されたKPIテンプレートから選択可能
 * プロジェクト作成時に「KPIツリーテンプレート」から選択
 * テンプレートは自動的にSupabase kpi_tree_nodes に保存される
 */

// グローバルKPIテンプレートオブジェクト
const KPI_TEMPLATES = {

  // 1. 小売店舗売上改善
  retail: {
    title: "小売店舗売上改善",
    description: "売上 × リピート × 新規顧客での売上改善テンプレート",
    nodes: [
      {
        title: "月売上 500万円",
        level: 1,
        target: 5000000,
        unit: "円",
        weight: null,
        children: [
          {
            title: "既存顧客リピート売上",
            level: 2,
            target: 3500000,
            unit: "円",
            weight: 0.7,
            children: [
              { title: "既存顧客数", level: 3, target: 200, unit: "人", weight: 0.5 },
              { title: "平均購買頻度", level: 3, target: 2.5, unit: "回/月", weight: 0.5 }
            ]
          },
          {
            title: "新規顧客売上",
            level: 2,
            target: 1500000,
            unit: "円",
            weight: 0.3,
            children: [
              { title: "新規顧客数", level: 3, target: 100, unit: "人/月", weight: 0.6 },
              { title: "新規顧客平均単価", level: 3, target: 15000, unit: "円", weight: 0.4 }
            ]
          }
        ]
      }
    ]
  },

  // 2. 飲食店回転率改善
  food: {
    title: "飲食店回転率改善",
    description: "テーブル回転数 × 客単価でのARPU改善テンプレート",
    nodes: [
      {
        title: "月売上 300万円",
        level: 1,
        target: 3000000,
        unit: "円",
        weight: null,
        children: [
          {
            title: "ランチ営業売上",
            level: 2,
            target: 1200000,
            unit: "円",
            weight: 0.4,
            children: [
              { title: "テーブル回転数", level: 3, target: 45, unit: "回/日", weight: 0.6 },
              { title: "平均客単価", level: 3, target: 1300, unit: "円", weight: 0.4 }
            ]
          },
          {
            title: "ディナー営業売上",
            level: 2,
            target: 1800000,
            unit: "円",
            weight: 0.6,
            children: [
              { title: "テーブル回転数", level: 3, target: 30, unit: "回/日", weight: 0.5 },
              { title: "平均客単価", level: 3, target: 3000, unit: "円", weight: 0.5 }
            ]
          }
        ]
      }
    ]
  },

  // 3. サービス業新規顧客獲得
  service: {
    title: "サービス業新規顧客獲得",
    description: "新規顧客数 × 成約率での成長テンプレート",
    nodes: [
      {
        title: "月新規顧客 50人",
        level: 1,
        target: 50,
        unit: "人/月",
        weight: null,
        children: [
          {
            title: "WEB経由新規顧客",
            level: 2,
            target: 30,
            unit: "人/月",
            weight: 0.6,
            children: [
              { title: "WEB問い合わせ数", level: 3, target: 100, unit: "件/月", weight: 0.5 },
              { title: "成約率", level: 3, target: 30, unit: "%", weight: 0.5 }
            ]
          },
          {
            title: "紹介・営業新規顧客",
            level: 2,
            target: 20,
            unit: "人/月",
            weight: 0.4,
            children: [
              { title: "営業活動数", level: 3, target: 50, unit: "件/月", weight: 0.6 },
              { title: "成約率", level: 3, target: 40, unit: "%", weight: 0.4 }
            ]
          }
        ]
      }
    ]
  },

  // 4. オンラインストア転換率改善
  ecommerce: {
    title: "オンラインストア転換率改善",
    description: "訪問者数 × 転換率でのセールス拡大テンプレート",
    nodes: [
      {
        title: "月売上 100万円",
        level: 1,
        target: 1000000,
        unit: "円",
        weight: null,
        children: [
          {
            title: "訪問者売上効率",
            level: 2,
            target: 1000000,
            unit: "円",
            weight: 1.0,
            children: [
              { title: "月間訪問者数", level: 3, target: 10000, unit: "人/月", weight: 0.4 },
              { title: "転換率（購買率）", level: 3, target: 10, unit: "%", weight: 0.3 },
              { title: "平均購買単価", level: 3, target: 10000, unit: "円", weight: 0.3 }
            ]
          }
        ]
      }
    ]
  },

  // 5. スタッフ定着率改善
  staffretention: {
    title: "スタッフ定着率改善",
    description: "離職率削減 × スタッフ満足度向上テンプレート",
    nodes: [
      {
        title: "スタッフ離職率 8% 以下",
        level: 1,
        target: 8,
        unit: "%",
        weight: null,
        children: [
          {
            title: "新人スタッフ定着率向上",
            level: 2,
            target: 90,
            unit: "%",
            weight: 0.6,
            children: [
              { title: "研修充実度", level: 3, target: 90, unit: "%", weight: 0.5 },
              { title: "3ヶ月後残存率", level: 3, target: 90, unit: "%", weight: 0.5 }
            ]
          },
          {
            title: "既存スタッフ満足度向上",
            level: 2,
            target: 75,
            unit: "%",
            weight: 0.4,
            children: [
              { title: "評価制度の透明性", level: 3, target: 80, unit: "%", weight: 0.5 },
              { title: "キャリアパス満足度", level: 3, target: 70, unit: "%", weight: 0.5 }
            ]
          }
        ]
      }
    ]
  }
};

/**
 * テンプレートから指定された KPI ノードを取得
 * @param {string} templateId - テンプレート ID
 * @returns {object} テンプレートノード
 */
function getKPITemplate(templateId) {
  return KPI_TEMPLATES[templateId] || null;
}

/**
 * テンプレートのノードを平坦配列に変換（Supabase 保存用）
 * @param {array} nodes - KPI ノード配列
 * @param {string} parentNodeId - 親ノード ID
 * @returns {array} 平坦化されたノード配列
 */
function flattenKPINodes(nodes, parentNodeId = null) {
  const flattened = [];

  nodes.forEach(node => {
    // 子ノードを削除したコピーを作成
    const nodeWithoutChildren = {
      ...node,
      parent_node_id: parentNodeId
    };
    delete nodeWithoutChildren.children;

    flattened.push(nodeWithoutChildren);

    // 子ノードを再帰的に処理
    if (node.children && node.children.length > 0) {
      const childFlattened = flattenKPINodes(node.children, node.id || null);
      flattened.push(...childFlattened);
    }
  });

  return flattened;
}

/**
 * テンプレートの説明を取得（UI表示用）
 * @returns {array} テンプレート一覧
 */
function getTemplateList() {
  return Object.entries(KPI_TEMPLATES).map(([key, template]) => ({
    id: key,
    title: template.title,
    description: template.description
  }));
}
