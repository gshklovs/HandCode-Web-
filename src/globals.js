let isEditMode = false;

export const editModeState = {
  get: () => isEditMode,
  set: (value) => {
    isEditMode = value;
    console.log('Edit mode changed to:', isEditMode);
  }
};