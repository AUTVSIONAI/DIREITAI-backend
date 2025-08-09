import { useState, useCallback, useEffect } from 'react';
import { useForm as useReactHookForm, UseFormProps, FieldValues, Path, PathValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Hook personalizado para formulários com validação Zod
 */
export const useForm = <TFieldValues extends FieldValues = FieldValues>(
  schema?: ZodSchema<TFieldValues>,
  options?: UseFormProps<TFieldValues>
) => {
  const form = useReactHookForm<TFieldValues>({
    resolver: schema ? zodResolver(schema) : undefined,
    mode: 'onChange',
    ...options
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
    reset,
    setValue,
    getValues,
    watch,
    trigger
  } = form;

  // Estado para controlar se o formulário foi submetido
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Função para submeter o formulário com tratamento de erro
  const onSubmit = useCallback(
    (submitFn: (data: TFieldValues) => Promise<void> | void) => {
      return handleSubmit(async (data) => {
        try {
          setHasSubmitted(true);
          await submitFn(data);
        } catch (error) {
          console.error('Erro ao submeter formulário:', error);
          
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error('Erro ao submeter formulário');
          }
        }
      });
    },
    [handleSubmit]
  );

  // Função para resetar o formulário
  const resetForm = useCallback(
    (values?: Partial<TFieldValues>) => {
      reset(values);
      setHasSubmitted(false);
    },
    [reset]
  );

  // Função para validar um campo específico
  const validateField = useCallback(
    async (fieldName: Path<TFieldValues>) => {
      return await trigger(fieldName);
    },
    [trigger]
  );

  // Função para validar todo o formulário
  const validateForm = useCallback(async () => {
    return await trigger();
  }, [trigger]);

  // Função para definir valor de campo com validação
  const setFieldValue = useCallback(
    <TFieldName extends Path<TFieldValues>>(
      name: TFieldName,
      value: PathValue<TFieldValues, TFieldName>,
      options?: { shouldValidate?: boolean; shouldDirty?: boolean }
    ) => {
      setValue(name, value, {
        shouldValidate: true,
        shouldDirty: true,
        ...options
      });
    },
    [setValue]
  );

  // Função para obter erro de um campo específico
  const getFieldError = useCallback(
    (fieldName: Path<TFieldValues>) => {
      return errors[fieldName]?.message;
    },
    [errors]
  );

  // Função para verificar se um campo tem erro
  const hasFieldError = useCallback(
    (fieldName: Path<TFieldValues>) => {
      return !!errors[fieldName];
    },
    [errors]
  );

  // Função para obter todos os valores do formulário
  const getAllValues = useCallback(() => {
    return getValues();
  }, [getValues]);

  // Função para observar mudanças em campos específicos
  const watchFields = useCallback(
    (fieldNames?: Path<TFieldValues> | Path<TFieldValues>[]) => {
      return watch(fieldNames);
    },
    [watch]
  );

  return {
    ...form,
    onSubmit,
    resetForm,
    validateField,
    validateForm,
    setFieldValue,
    getFieldError,
    hasFieldError,
    getAllValues,
    watchFields,
    hasSubmitted,
    canSubmit: isValid && !isSubmitting,
    hasErrors: Object.keys(errors).length > 0,
    isFormDirty: isDirty,
    isFormValid: isValid,
    isFormSubmitting: isSubmitting
  };
};

/**
 * Hook para validação manual com Zod
 */
export const useValidation = <T = any>(schema: ZodSchema<T>) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  const validate = useCallback(
    (data: unknown): data is T => {
      try {
        schema.parse(data);
        setErrors({});
        setIsValid(true);
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            fieldErrors[path] = err.message;
          });
          setErrors(fieldErrors);
        }
        setIsValid(false);
        return false;
      }
    },
    [schema]
  );

  const validateField = useCallback(
    (fieldName: string, value: unknown): boolean => {
      try {
        // Cria um schema parcial para validar apenas o campo específico
        const fieldSchema = schema.pick({ [fieldName]: true } as any);
        fieldSchema.parse({ [fieldName]: value });
        
        // Remove o erro do campo se a validação passou
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
        
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldError = error.errors.find(err => err.path.join('.') === fieldName);
          if (fieldError) {
            setErrors(prev => ({
              ...prev,
              [fieldName]: fieldError.message
            }));
          }
        }
        return false;
      }
    },
    [schema]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
    setIsValid(false);
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    errors,
    isValid,
    hasErrors: Object.keys(errors).length > 0,
    getFieldError: (fieldName: string) => errors[fieldName],
    hasFieldError: (fieldName: string) => !!errors[fieldName]
  };
};

/**
 * Hook para formulários com múltiplas etapas
 */
export const useMultiStepForm = <T extends FieldValues>(
  steps: Array<{
    name: string;
    schema?: ZodSchema<Partial<T>>;
    fields: (keyof T)[];
  }>,
  options?: UseFormProps<T>
) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const form = useReactHookForm<T>({
    mode: 'onChange',
    ...options
  });

  const { trigger, getValues, formState: { errors } } = form;

  const currentStepConfig = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Validar etapa atual
  const validateCurrentStep = useCallback(async () => {
    if (!currentStepConfig.schema) return true;
    
    const currentValues = getValues();
    const stepData: Partial<T> = {};
    
    currentStepConfig.fields.forEach(field => {
      stepData[field] = currentValues[field];
    });

    try {
      currentStepConfig.schema.parse(stepData);
      return true;
    } catch (error) {
      // Trigger validação dos campos da etapa atual
      await trigger(currentStepConfig.fields as Path<T>[]);
      return false;
    }
  }, [currentStep, currentStepConfig, getValues, trigger]);

  // Ir para próxima etapa
  const nextStep = useCallback(async () => {
    const isValid = await validateCurrentStep();
    
    if (isValid && !isLastStep) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(prev => prev + 1);
      return true;
    }
    
    return false;
  }, [validateCurrentStep, isLastStep, currentStep]);

  // Voltar para etapa anterior
  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  // Ir para etapa específica
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [steps.length]);

  // Verificar se etapa foi completada
  const isStepCompleted = useCallback((stepIndex: number) => {
    return completedSteps.includes(stepIndex);
  }, [completedSteps]);

  // Verificar se etapa tem erros
  const stepHasErrors = useCallback((stepIndex: number) => {
    const stepConfig = steps[stepIndex];
    return stepConfig.fields.some(field => errors[field]);
  }, [steps, errors]);

  // Obter progresso do formulário
  const progress = {
    current: currentStep + 1,
    total: steps.length,
    percentage: ((currentStep + 1) / steps.length) * 100,
    completed: completedSteps.length,
    remaining: steps.length - (currentStep + 1)
  };

  return {
    ...form,
    currentStep,
    currentStepConfig,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    goToStep,
    validateCurrentStep,
    isStepCompleted,
    stepHasErrors,
    progress,
    steps
  };
};

/**
 * Hook para auto-save de formulário
 */
export const useAutoSave = <T extends FieldValues>(
  form: ReturnType<typeof useReactHookForm<T>>,
  saveFn: (data: T) => Promise<void>,
  options?: {
    delay?: number;
    enabled?: boolean;
    onSave?: () => void;
    onError?: (error: Error) => void;
  }
) => {
  const { delay = 2000, enabled = true, onSave, onError } = options || {};
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { watch, getValues, formState: { isDirty } } = form;

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const subscription = watch(async () => {
      const timeoutId = setTimeout(async () => {
        try {
          setIsSaving(true);
          const data = getValues();
          await saveFn(data);
          setLastSaved(new Date());
          onSave?.();
        } catch (error) {
          console.error('Erro no auto-save:', error);
          onError?.(error as Error);
        } finally {
          setIsSaving(false);
        }
      }, delay);

      return () => clearTimeout(timeoutId);
    });

    return () => subscription.unsubscribe();
  }, [watch, getValues, saveFn, delay, enabled, isDirty, onSave, onError]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges: isDirty && !isSaving
  };
};

/**
 * Hook para formulário com confirmação de saída
 */
export const useFormExitConfirmation = <T extends FieldValues>(
  form: ReturnType<typeof useReactHookForm<T>>,
  message = 'Você tem alterações não salvas. Deseja realmente sair?'
) => {
  const { formState: { isDirty } } = form;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  const confirmExit = useCallback(() => {
    if (isDirty) {
      return window.confirm(message);
    }
    return true;
  }, [isDirty, message]);

  return {
    hasUnsavedChanges: isDirty,
    confirmExit
  };
};