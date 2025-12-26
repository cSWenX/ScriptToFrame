import { createContext, useContext, useReducer, useCallback } from 'react';

/**
 * 项目状态管理 Context
 * 用于管理儿童绘本 IDE 的全局状态
 */

// 项目初始状态
const initialProject = {
  id: null,
  title: '未命名绘本',
  style_preset: 'watercolor', // 全局画风
  created_at: null,
  updated_at: null,

  // 角色资产
  assets: [],

  // 页面数据
  pages: [],

  // 当前阶段 (1-4)
  currentPhase: 1,

  // 各阶段状态: 'pending' | 'in_progress' | 'completed' | 'locked'
  phaseStatus: {
    1: 'pending',      // 角色定妆
    2: 'locked',       // 剧本确认
    3: 'locked',       // 图片生成
    4: 'locked'        // 音频合成
  },

  // 原始故事文本
  rawStory: '',

  // AI 分析后的脚本数据
  scriptData: null,

  // 右侧当前激活的 Tab: 'assets' | 'storyboard' | 'flipbook'
  activeRightTab: 'assets',

  // 左侧当前激活的 Tab: 'input' | 'script'
  activeLeftTab: 'input',

  // 全局设置
  settings: {
    aspectRatio: '16:9',
    resolution: '2k',
    language: 'zh'
  }
};

// 初始应用状态
const initialState = {
  // 当前项目
  project: { ...initialProject },

  // 项目列表
  projectList: [],

  // UI 状态
  isNavExpanded: false,
  isLoading: false,
  loadingMessage: '',

  // 进度状态
  progress: {
    visible: false,
    value: 0,
    title: '',
    subtitle: ''
  },

  // 错误状态
  error: null
};

// Action Types
const ActionTypes = {
  // 项目操作
  NEW_PROJECT: 'NEW_PROJECT',
  LOAD_PROJECT: 'LOAD_PROJECT',
  SAVE_PROJECT: 'SAVE_PROJECT',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  SET_PROJECT_LIST: 'SET_PROJECT_LIST',

  // 故事操作
  SET_RAW_STORY: 'SET_RAW_STORY',
  SET_SCRIPT_DATA: 'SET_SCRIPT_DATA',

  // 角色操作
  ADD_ASSET: 'ADD_ASSET',
  UPDATE_ASSET: 'UPDATE_ASSET',
  REMOVE_ASSET: 'REMOVE_ASSET',
  LOCK_ASSET: 'LOCK_ASSET',
  CLEAR_ASSETS: 'CLEAR_ASSETS',

  // 风格操作
  SET_STYLE_PRESET: 'SET_STYLE_PRESET',

  // 页面操作
  SET_PAGES: 'SET_PAGES',
  UPDATE_PAGE: 'UPDATE_PAGE',
  REGENERATE_PAGE: 'REGENERATE_PAGE',

  // 阶段操作
  SET_PHASE: 'SET_PHASE',
  UPDATE_PHASE_STATUS: 'UPDATE_PHASE_STATUS',

  // Tab 操作
  SET_RIGHT_TAB: 'SET_RIGHT_TAB',
  SET_LEFT_TAB: 'SET_LEFT_TAB',

  // UI 操作
  TOGGLE_NAV: 'TOGGLE_NAV',
  SET_LOADING: 'SET_LOADING',
  SET_PROGRESS: 'SET_PROGRESS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',

  // 设置操作
  UPDATE_SETTINGS: 'UPDATE_SETTINGS'
};

// Reducer
function projectReducer(state, action) {
  switch (action.type) {
    // 项目操作
    case ActionTypes.NEW_PROJECT:
      return {
        ...state,
        project: {
          ...initialProject,
          id: `project_${Date.now()}`,
          created_at: new Date().toISOString()
        }
      };

    case ActionTypes.LOAD_PROJECT:
      return {
        ...state,
        project: action.payload
      };

    case ActionTypes.UPDATE_PROJECT:
      return {
        ...state,
        project: {
          ...state.project,
          ...action.payload,
          updated_at: new Date().toISOString()
        }
      };

    case ActionTypes.SET_PROJECT_LIST:
      return {
        ...state,
        projectList: action.payload
      };

    // 故事操作
    case ActionTypes.SET_RAW_STORY:
      return {
        ...state,
        project: {
          ...state.project,
          rawStory: action.payload
        }
      };

    case ActionTypes.SET_SCRIPT_DATA:
      return {
        ...state,
        project: {
          ...state.project,
          scriptData: action.payload,
          // 分析完成后，解锁阶段2
          phaseStatus: {
            ...state.project.phaseStatus,
            2: 'pending'
          }
        }
      };

    // 角色操作
    case ActionTypes.ADD_ASSET:
      return {
        ...state,
        project: {
          ...state.project,
          assets: [...state.project.assets, action.payload]
        }
      };

    case ActionTypes.UPDATE_ASSET:
      return {
        ...state,
        project: {
          ...state.project,
          assets: state.project.assets.map(asset =>
            asset.id === action.payload.id
              ? { ...asset, ...action.payload }
              : asset
          )
        }
      };

    case ActionTypes.REMOVE_ASSET:
      return {
        ...state,
        project: {
          ...state.project,
          assets: state.project.assets.filter(asset => asset.id !== action.payload)
        }
      };

    case ActionTypes.LOCK_ASSET:
      return {
        ...state,
        project: {
          ...state.project,
          assets: state.project.assets.map(asset =>
            asset.id === action.payload
              ? { ...asset, locked: true }
              : asset
          )
        }
      };

    case ActionTypes.CLEAR_ASSETS:
      return {
        ...state,
        project: {
          ...state.project,
          assets: []
        }
      };

    case ActionTypes.SET_STYLE_PRESET:
      return {
        ...state,
        project: {
          ...state.project,
          style_preset: action.payload
        }
      };

    // 页面操作
    case ActionTypes.SET_PAGES:
      return {
        ...state,
        project: {
          ...state.project,
          pages: action.payload
        }
      };

    case ActionTypes.UPDATE_PAGE:
      return {
        ...state,
        project: {
          ...state.project,
          pages: state.project.pages.map(page =>
            page.page_index === action.payload.page_index
              ? { ...page, ...action.payload }
              : page
          )
        }
      };

    // 阶段操作
    case ActionTypes.SET_PHASE:
      return {
        ...state,
        project: {
          ...state.project,
          currentPhase: action.payload,
          // 自动切换右侧 Tab
          activeRightTab: action.payload === 1 ? 'assets' :
                         action.payload === 3 ? 'storyboard' :
                         action.payload === 4 ? 'flipbook' : state.project.activeRightTab
        }
      };

    case ActionTypes.UPDATE_PHASE_STATUS:
      return {
        ...state,
        project: {
          ...state.project,
          phaseStatus: {
            ...state.project.phaseStatus,
            [action.payload.phase]: action.payload.status,
            // 当前阶段完成时，解锁下一阶段
            ...(action.payload.status === 'completed' && action.payload.phase < 4
              ? { [action.payload.phase + 1]: 'pending' }
              : {})
          }
        }
      };

    // Tab 操作
    case ActionTypes.SET_RIGHT_TAB:
      return {
        ...state,
        project: {
          ...state.project,
          activeRightTab: action.payload
        }
      };

    case ActionTypes.SET_LEFT_TAB:
      return {
        ...state,
        project: {
          ...state.project,
          activeLeftTab: action.payload
        }
      };

    // UI 操作
    case ActionTypes.TOGGLE_NAV:
      return {
        ...state,
        isNavExpanded: action.payload !== undefined ? action.payload : !state.isNavExpanded
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.loading,
        loadingMessage: action.payload.message || ''
      };

    case ActionTypes.SET_PROGRESS:
      return {
        ...state,
        progress: {
          ...state.progress,
          ...action.payload
        }
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    // 设置操作
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        project: {
          ...state.project,
          settings: {
            ...state.project.settings,
            ...action.payload
          }
        }
      };

    default:
      return state;
  }
}

// Context
const ProjectContext = createContext(null);

// Provider
export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // Action Creators
  const actions = {
    // 项目操作
    newProject: useCallback(() => {
      dispatch({ type: ActionTypes.NEW_PROJECT });
    }, []),

    loadProject: useCallback((project) => {
      dispatch({ type: ActionTypes.LOAD_PROJECT, payload: project });
    }, []),

    updateProject: useCallback((data) => {
      dispatch({ type: ActionTypes.UPDATE_PROJECT, payload: data });
    }, []),

    setProjectList: useCallback((projects) => {
      dispatch({ type: ActionTypes.SET_PROJECT_LIST, payload: projects });
    }, []),

    // 保存项目到服务器
    saveProject: useCallback(async (type = 'draft') => {
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { loading: true, message: '保存中...' } });

        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: state.project,
            type
          })
        });

        const result = await response.json();

        if (result.success) {
          // 更新项目ID
          dispatch({
            type: ActionTypes.UPDATE_PROJECT,
            payload: { id: result.data.id }
          });
          return { success: true, data: result.data };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { loading: false } });
      }
    }, [state.project]),

    // 加载项目列表
    loadProjectList: useCallback(async (type = 'all') => {
      try {
        const response = await fetch(`/api/projects?type=${type}`);
        const result = await response.json();

        if (result.success) {
          dispatch({ type: ActionTypes.SET_PROJECT_LIST, payload: result.data });
          return { success: true, data: result.data };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    }, []),

    // 删除项目
    deleteProject: useCallback(async (projectId) => {
      try {
        const response = await fetch(`/api/projects?id=${projectId}`, {
          method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
          // 从列表中移除
          dispatch({
            type: ActionTypes.SET_PROJECT_LIST,
            payload: state.projectList.filter(p => p.id !== projectId)
          });
          return { success: true };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    }, [state.projectList]),

    // 故事操作
    setRawStory: useCallback((story) => {
      dispatch({ type: ActionTypes.SET_RAW_STORY, payload: story });
    }, []),

    setScriptData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_SCRIPT_DATA, payload: data });
    }, []),

    // 角色操作
    addAsset: useCallback((asset) => {
      dispatch({ type: ActionTypes.ADD_ASSET, payload: asset });
    }, []),

    updateAsset: useCallback((asset) => {
      dispatch({ type: ActionTypes.UPDATE_ASSET, payload: asset });
    }, []),

    removeAsset: useCallback((assetId) => {
      dispatch({ type: ActionTypes.REMOVE_ASSET, payload: assetId });
    }, []),

    lockAsset: useCallback((assetId) => {
      dispatch({ type: ActionTypes.LOCK_ASSET, payload: assetId });
    }, []),

    clearAssets: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_ASSETS });
    }, []),

    setStylePreset: useCallback((style) => {
      dispatch({ type: ActionTypes.SET_STYLE_PRESET, payload: style });
    }, []),

    // 页面操作
    setPages: useCallback((pages) => {
      dispatch({ type: ActionTypes.SET_PAGES, payload: pages });
    }, []),

    updatePage: useCallback((pageData) => {
      dispatch({ type: ActionTypes.UPDATE_PAGE, payload: pageData });
    }, []),

    // 阶段操作
    setPhase: useCallback((phase) => {
      dispatch({ type: ActionTypes.SET_PHASE, payload: phase });
    }, []),

    updatePhaseStatus: useCallback((phase, status) => {
      dispatch({ type: ActionTypes.UPDATE_PHASE_STATUS, payload: { phase, status } });
    }, []),

    // Tab 操作
    setRightTab: useCallback((tab) => {
      dispatch({ type: ActionTypes.SET_RIGHT_TAB, payload: tab });
    }, []),

    setLeftTab: useCallback((tab) => {
      dispatch({ type: ActionTypes.SET_LEFT_TAB, payload: tab });
    }, []),

    // UI 操作
    toggleNav: useCallback((expanded) => {
      dispatch({ type: ActionTypes.TOGGLE_NAV, payload: expanded });
    }, []),

    setLoading: useCallback((loading, message = '') => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { loading, message } });
    }, []),

    setProgress: useCallback((progressData) => {
      dispatch({ type: ActionTypes.SET_PROGRESS, payload: progressData });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    }, []),

    // 设置操作
    updateSettings: useCallback((settings) => {
      dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: settings });
    }, [])
  };

  return (
    <ProjectContext.Provider value={{ state, actions, dispatch }}>
      {children}
    </ProjectContext.Provider>
  );
}

// Hook
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// 导出类型常量
export { ActionTypes };
