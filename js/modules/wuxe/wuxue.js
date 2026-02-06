// 主文件
import { loadSkillData, loadSkillAutoData, loadActiveSkillData, getUniqueValues, preloadData } from './dataLoader.js';
import { initModals, createFilterBadges, clearFilters, matchesFilters, toggleFilter } from './uiManager.js';
import { updateSkillList } from './skillDisplay.js';

// 导出 skillData 和 activeSkillData
export let skillData = null;
export let activeSkillData = null;
let dataLoadingComplete = false;

// 初始化UI（无需数据的部分）
function initUI() {
    // 初始化所有Modal
    initModals();

    // 添加搜索监听器
    document.getElementById('searchInput').addEventListener('input', () => {
        if (dataLoadingComplete && skillData) {
            updateSkillList(skillData, matchesFilters);
        }
    });

    // 检查URL参数并自动搜索
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        document.getElementById('searchInput').value = query;
    }

    // 添加清除过滤器的事件处理
    window.clearFilters = (filterType) => {
        clearFilters(filterType);
        if (dataLoadingComplete && skillData) {
            updateSkillList(skillData, matchesFilters);
        }
    };
}

// 后台加载数据
async function loadDataInBackground() {
    try {
        // 并行加载所有数据
        console.log('开始并行加载数据...');

        const [data1, data2, data3] = await Promise.all([
            loadSkillData(),
            loadActiveSkillData(),
            loadSkillAutoData()
        ]);

        skillData = data1;
        activeSkillData = data2;
        const skillAutoData = data3;

        console.log('数据加载完成！');

        // 创建门派过滤器
        const families = getUniqueValues(skillData.skills, 'familyList');
        createFilterBadges('familyFilters', families, 'family');

        // 创建武学属性过滤器
        const elements = getUniqueValues(skillData.skills, 'zhaoJiaDefDamageClass');
        createFilterBadges('elementFilters', elements, 'element');

        // 创建武学类型过滤器
        const methods = getUniqueValues(skillData.skills, 'methods');
        createFilterBadges('methodsFilters', methods, 'methods');

        // 标记数据加载完成
        dataLoadingComplete = true;

        // 显示技能列表
        updateSkillList(skillData, matchesFilters);

        console.log('页面渲染完成！');

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// 初始化页面
async function initializePage() {
    // 立即开始预加载数据（不等待UI初始化）
    preloadData();

    // 先初始化UI（立即显示）
    initUI();

    // 后台加载数据
    loadDataInBackground();
}

// 页面加载完成后开始初始化
document.addEventListener('DOMContentLoaded', initializePage);

// 确保 toggleFilter 函数在全局作用域中可用
window.toggleFilter = toggleFilter;
