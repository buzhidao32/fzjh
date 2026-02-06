// 主文件
import { loadSkillData, loadSkillAutoData, loadActiveSkillData, getUniqueValues } from './dataLoader.js';
import { initModals, createFilterBadges, clearFilters, matchesFilters, toggleFilter } from './uiManager.js';
import { updateSkillList } from './skillDisplay.js';

export let skillData = null;
export let activeSkillData = null;

async function initializePage() {
    try {
        initModals();

        createFilterBadges('familyFilters', [], 'family');
        createFilterBadges('elementFilters', [], 'element');
        createFilterBadges('methodsFilters', [], 'methods');

        document.getElementById('searchInput').addEventListener('input', () => {
            updateSkillList(skillData, matchesFilters);
        });

        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            document.getElementById('searchInput').value = query;
        }

        window.clearFilters = (filterType) => {
            clearFilters(filterType);
            updateSkillList(skillData, matchesFilters);
        };

        Promise.all([
            loadSkillData(),
            loadActiveSkillData(),
            loadSkillAutoData()
        ]).then(([data1, data2]) => {
            skillData = data1;
            activeSkillData = data2;

            const families = getUniqueValues(skillData.skills, 'familyList');
            createFilterBadges('familyFilters', families, 'family');
            const elements = getUniqueValues(skillData.skills, 'zhaoJiaDefDamageClass');
            createFilterBadges('elementFilters', elements, 'element');
            const methods = getUniqueValues(skillData.skills, 'methods');
            createFilterBadges('methodsFilters', methods, 'methods');

            updateSkillList(skillData, matchesFilters);

        }).catch(error => {
            console.error('数据加载失败:', error);
        });

    } catch (error) {
        console.error('页面初始化失败:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializePage);
window.toggleFilter = toggleFilter;
