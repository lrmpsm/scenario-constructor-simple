import React, { useEffect, useMemo, useState } from "react";

type StepType = "start" | "text" | "choice" | "end";
type AccessType = "public" | "link" | "draft";

type Choice = {
  id: string;
  text: string;
  explanation: string;
  nextStepId: string | null;
  scoreDelta: number | "";
};

type Step = {
  id: string;
  title: string;
  description: string;
  type: StepType;
  imageUrl: string;
  nextStepId: string | null;
  choices: Choice[];
  isStart?: boolean;
  createdAt: number;
};

type ScenarioInfo = {
  title: string;
  description: string;
  previewUrl: string;
  accessType: AccessType;
  hasScoring: boolean;
};

const initialScenarioInfo: ScenarioInfo = {
  title: "Новый сценарий",
  description: "Описание сценария",
  previewUrl: "",
  accessType: "draft",
  hasScoring: false,
};

const initialSteps: Step[] = [
  {
    id: "step-1",
    title: "Начальный шаг",
    description: "Добро пожаловать в сценарий. Нажмите далее, чтобы продолжить.",
    type: "start",
    imageUrl: "",
    nextStepId: "step-2",
    choices: [],
    isStart: true,
    createdAt: 1,
  },
  {
    id: "step-2",
    title: "Основной вопрос",
    description: "Выберите один из вариантов ответа.",
    type: "choice",
    imageUrl: "",
    nextStepId: null,
    createdAt: 2,
    choices: [
      {
        id: "choice-1",
        text: "Да",
        explanation: "Положительный вариант ответа.",
        nextStepId: "step-3",
        scoreDelta: 1,
      },
      {
        id: "choice-2",
        text: "Нет",
        explanation: "Отрицательный вариант ответа.",
        nextStepId: "step-4",
        scoreDelta: 0,
      },
    ],
  },
  {
    id: "step-3",
    title: "Текстовый шаг",
    description: "Здесь пользователю показывается дополнительная информация.",
    type: "text",
    imageUrl: "",
    nextStepId: "step-5",
    choices: [],
    createdAt: 3,
  },
  {
    id: "step-4",
    title: "Альтернативный текст",
    description: "Этот шаг показывается при выборе варианта “Нет”.",
    type: "text",
    imageUrl: "",
    nextStepId: "step-5",
    choices: [],
    createdAt: 4,
  },
  {
    id: "step-5",
    title: "Конец",
    description: "Сценарий завершен.",
    type: "end",
    imageUrl: "",
    nextStepId: null,
    choices: [],
    createdAt: 5,
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getStepTypeLabel(type: StepType) {
  switch (type) {
    case "start":
      return "Начало";
    case "text":
      return "Текст";
    case "choice":
      return "Выбор";
    case "end":
      return "Конец";
    default:
      return type;
  }
}

function getAccessLabel(type: AccessType) {
  switch (type) {
    case "public":
      return "Публичный";
    case "link":
      return "По ссылке";
    case "draft":
      return "Черновик";
    default:
      return type;
  }
}

function truncate(text: string, max = 40) {
  if (!text) return "Без текста";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function ScenarioEditorPage() {
  const [scenarioInfo, setScenarioInfo] = useState<ScenarioInfo>(initialScenarioInfo);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [activeStepId, setActiveStepId] = useState<string>(initialSteps[0].id);
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [statusText, setStatusText] = useState("Готово к редактированию");

  const activeStep = steps.find((step) => step.id === activeStepId) ?? steps[0];
  const activeChoice = activeStep?.choices.find((choice) => choice.id === activeChoiceId) ?? null;

  useEffect(() => {
    return () => {
      if (scenarioInfo.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(scenarioInfo.previewUrl);
      }
    };
  }, [scenarioInfo.previewUrl]);

  const filteredSteps = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return [...steps].sort((a, b) => a.createdAt - b.createdAt);
    return [...steps]
      .sort((a, b) => a.createdAt - b.createdAt)
      .filter((step) => step.title.toLowerCase().includes(normalized));
  }, [search, steps]);

  const selectableNextSteps = useMemo(
    () => steps.filter((step) => step.id !== activeStepId),
    [steps, activeStepId]
  );

  const setStepField = <K extends keyof Step>(field: K, value: Step[K]) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id !== activeStepId) return step;

        const updated = { ...step, [field]: value };

        if (field === "type") {
          const newType = value as StepType;

          if (newType === "text") {
            updated.choices = [];
            updated.nextStepId = updated.nextStepId ?? null;
          }

          if (newType === "choice") {
            updated.nextStepId = null;
            if (updated.choices.length === 0) {
              updated.choices = [
                {
                  id: `choice-${Date.now()}`,
                  text: "",
                  explanation: "",
                  nextStepId: null,
                  scoreDelta: "",
                },
              ];
              setActiveChoiceId(updated.choices[0].id);
            }
          }

          if (newType === "end") {
            updated.choices = [];
            updated.nextStepId = null;
            setActiveChoiceId(null);
          }
        }

        return updated;
      })
    );

    if (field === "type" && value !== "choice") {
      setActiveChoiceId(null);
    }
  };

  const setChoiceField = <K extends keyof Choice>(field: K, value: Choice[K]) => {
    if (!activeChoiceId) return;

    setSteps((prev) =>
      prev.map((step) => {
        if (step.id !== activeStepId) return step;
        return {
          ...step,
          choices: step.choices.map((choice) =>
            choice.id === activeChoiceId ? { ...choice, [field]: value } : choice
          ),
        };
      })
    );
  };

  const handleSelectStep = (stepId: string) => {
    setActiveStepId(stepId);

    const nextStep = steps.find((step) => step.id === stepId);
    if (nextStep?.type === "choice" && nextStep.choices.length > 0) {
      setActiveChoiceId(nextStep.choices[0].id);
    } else {
      setActiveChoiceId(null);
    }
  };

  const handleAddStep = () => {
    const newId = `step-${Date.now()}`;
    const newStep: Step = {
      id: newId,
      title: `Новый шаг ${steps.length + 1}`,
      description: "",
      type: "text",
      imageUrl: "",
      nextStepId: null,
      choices: [],
      createdAt: Date.now(),
    };

    setSteps((prev) => [...prev, newStep]);
    setActiveStepId(newId);
    setActiveChoiceId(null);
    setStatusText("Шаг добавлен");
  };

  const handleDeleteStep = () => {
    if (!activeStep || activeStep.isStart) return;

    const confirmed = window.confirm(`Удалить шаг “${activeStep.title}”?`);
    if (!confirmed) return;

    const fallbackStep = steps.find((step) => step.isStart) ?? steps[0];

    setSteps((prev) =>
      prev
        .filter((step) => step.id !== activeStep.id)
        .map((step) => ({
          ...step,
          nextStepId: step.nextStepId === activeStep.id ? null : step.nextStepId,
          choices: step.choices.map((choice) => ({
            ...choice,
            nextStepId: choice.nextStepId === activeStep.id ? null : choice.nextStepId,
          })),
        }))
    );

    setActiveStepId(fallbackStep.id);
    setActiveChoiceId(null);
    setStatusText("Шаг удален");
  };

  const handleAddChoice = () => {
    if (!activeStep || activeStep.type !== "choice") return;
    if (activeStep.choices.length >= 4) return;

    const newChoice: Choice = {
      id: `choice-${Date.now()}`,
      text: "",
      explanation: "",
      nextStepId: null,
      scoreDelta: "",
    };

    setSteps((prev) =>
      prev.map((step) =>
        step.id === activeStepId ? { ...step, choices: [...step.choices, newChoice] } : step
      )
    );

    setActiveChoiceId(newChoice.id);
    setStatusText("Выбор добавлен");
  };

  const handleDeleteChoice = () => {
    if (!activeStep || activeStep.type !== "choice" || !activeChoiceId) return;

    const confirmed = window.confirm("Удалить выбранный вариант?");
    if (!confirmed) return;

    const remainingChoices = activeStep.choices.filter((choice) => choice.id !== activeChoiceId);

    setSteps((prev) =>
      prev.map((step) =>
        step.id === activeStepId
          ? {
              ...step,
              choices: remainingChoices,
            }
          : step
      )
    );

    setActiveChoiceId(remainingChoices[0]?.id ?? null);
    setStatusText("Выбор удален");
  };

  const handleSave = () => {
    setStatusText("Изменения сохранены локально");
  };

  const handleToggleScoring = (checked: boolean) => {
    setScenarioInfo((prev) => ({ ...prev, hasScoring: checked }));

    if (!checked) {
      setSteps((prev) =>
        prev.map((step) => ({
          ...step,
          choices: step.choices.map((choice) => ({
            ...choice,
            scoreDelta: "",
          })),
        }))
      );
    }
  };

  const handlePreviewUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScenarioInfo((prev) => {
      if (prev.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      return {
        ...prev,
        previewUrl: URL.createObjectURL(file),
      };
    });

    setStatusText("Preview сценария обновлен локально");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Конструктор сценариев</p>
              <h1 className="text-2xl font-bold text-slate-900">{scenarioInfo.title}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Доступ: <span className="font-medium">{getAccessLabel(scenarioInfo.accessType)}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Режим: <span className="font-medium">{scenarioInfo.hasScoring ? "Оцениваемый" : "Неоцениваемый"}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {statusText}
              </span>
              <button
                type="button"
                onClick={() => setIsScenarioModalOpen(true)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Редактировать информацию о сценарии
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
          <aside className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Менеджер шагов</h2>
                <p className="text-sm text-slate-500">Навигация и создание шагов</p>
              </div>
              <button
                type="button"
                onClick={handleAddStep}
                className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Добавить шаг
              </button>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Поиск по названию</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Введите название шага"
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-900"
              />
            </label>

            <div className="space-y-3">
              {filteredSteps.map((step) => {
                const isActive = step.id === activeStepId;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleSelectStep(step.id)}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition",
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{step.title || "Без названия"}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-medium",
                          isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {getStepTypeLabel(step.type)}
                      </span>
                    </div>
                    <p className={cn("text-xs", isActive ? "text-slate-200" : "text-slate-500")}>
                      {step.isStart ? "Начальный шаг" : `Создан: ${step.createdAt}`}
                    </p>
                  </button>
                );
              })}

              {filteredSteps.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Шаги не найдены
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Окно шага</h2>
                <p className="text-sm text-slate-500">Редактирование выбранного шага</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  Сохранить изменения
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStep}
                  disabled={!!activeStep.isStart}
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm font-medium transition",
                    activeStep.isStart
                      ? "cursor-not-allowed bg-slate-200 text-slate-400"
                      : "bg-red-600 text-white hover:bg-red-700"
                  )}
                >
                  Удалить шаг
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Заголовок шага</span>
                <input
                  value={activeStep.title}
                  onChange={(e) => setStepField("title", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Тип шага</span>
                <select
                  value={activeStep.type}
                  disabled={!!activeStep.isStart}
                  onChange={(e) => setStepField("type", e.target.value as StepType)}
                  className={cn(
                    "w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900",
                    activeStep.isStart && "cursor-not-allowed bg-slate-100 text-slate-500"
                  )}
                >
                  {activeStep.isStart ? (
                    <option value="start">Начало</option>
                  ) : (
                    <>
                      <option value="text">Текст</option>
                      <option value="choice">Выбор</option>
                      <option value="end">Конец</option>
                    </>
                  )}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Описание шага</span>
                <textarea
                  value={activeStep.description}
                  onChange={(e) => setStepField("description", e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Изображение</span>
                <input
                  value={activeStep.imageUrl}
                  onChange={(e) => setStepField("imageUrl", e.target.value)}
                  placeholder="URL изображения"
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                />
                {activeStep.imageUrl && (
                  <img
                    src={activeStep.imageUrl}
                    alt="Изображение шага"
                    className="mt-3 max-h-56 w-full rounded-2xl border border-slate-200 object-cover"
                  />
                )}
              </label>

              {(activeStep.type === "text" || activeStep.type === "start") && (
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Следующий шаг</span>
                  <select
                    value={activeStep.nextStepId ?? ""}
                    onChange={(e) => setStepField("nextStepId", e.target.value || null)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                  >
                    <option value="">Не выбран</option>
                    {selectableNextSteps.map((step) => (
                      <option key={step.id} value={step.id}>
                        {step.title || "Без названия"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {activeStep.type === "choice" && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Выборы шага</h3>
                    <p className="text-sm text-slate-500">Максимум 4 варианта</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddChoice}
                    disabled={activeStep.choices.length >= 4}
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm font-medium transition",
                      activeStep.choices.length >= 4
                        ? "cursor-not-allowed bg-slate-200 text-slate-400"
                        : "bg-slate-900 text-white hover:opacity-90"
                    )}
                  >
                    Добавить выбор
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {activeStep.choices.map((choice, index) => {
                    const nextStepTitle = steps.find((step) => step.id === choice.nextStepId)?.title;
                    const isActive = choice.id === activeChoiceId;

                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => setActiveChoiceId(choice.id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          isActive
                            ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900">Выбор #{index + 1}</span>
                          {isActive && (
                            <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                              Активный
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700">{truncate(choice.text)}</p>
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <p>Следующий шаг: {nextStepTitle ?? "не указан"}</p>
                          {scenarioInfo.hasScoring && (
                            <p>
                              Изменение счета: {choice.scoreDelta === "" ? "не указано" : choice.scoreDelta}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Окно выбора</h2>
                <p className="text-sm text-slate-500">
                  {activeStep.type === "choice"
                    ? activeChoice
                      ? `Редактирование варианта: ${activeChoice.text || "без названия"}`
                      : "Выберите карточку варианта слева"
                    : "Окно выбора доступно только для шага типа “Выбор”"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveChoiceId(null)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Обратно к шагу
              </button>
            </div>

            {activeStep.type !== "choice" && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Выберите шаг типа “Выбор”, чтобы редактировать варианты ответа.
              </div>
            )}

            {activeStep.type === "choice" && !activeChoice && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Выберите один из вариантов в окне шага.
              </div>
            )}

            {activeStep.type === "choice" && activeChoice && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Выбор #{activeStep.choices.findIndex((choice) => choice.id === activeChoice.id) + 1}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Шаг: {activeStep.title || "Без названия"}</p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Текст выбора</span>
                  <input
                    value={activeChoice.text}
                    onChange={(e) => setChoiceField("text", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Следующий шаг</span>
                  <select
                    value={activeChoice.nextStepId ?? ""}
                    onChange={(e) => setChoiceField("nextStepId", e.target.value || null)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                  >
                    <option value="">Не выбран</option>
                    {steps
                      .filter((step) => step.id !== activeStepId)
                      .map((step) => (
                        <option key={step.id} value={step.id}>
                          {step.title || "Без названия"}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Пояснение выбора</span>
                  <textarea
                    value={activeChoice.explanation}
                    onChange={(e) => setChoiceField("explanation", e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                  />
                </label>

                {scenarioInfo.hasScoring && (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Изменение счета пользователя</span>
                    <input
                      type="number"
                      value={activeChoice.scoreDelta}
                      onChange={(e) =>
                        setChoiceField(
                          "scoreDelta",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="Например: 1, 0, -2"
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                    />
                  </label>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteChoice}
                    className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    Удалить выбор
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {isScenarioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Информация о сценарии</h2>
                <p className="mt-1 text-sm text-slate-500">Редактирование основных данных сценария</p>
              </div>
              <button
                type="button"
                onClick={() => setIsScenarioModalOpen(false)}
                className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Название сценария</span>
                <input
                  value={scenarioInfo.title}
                  onChange={(e) => setScenarioInfo((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Описание сценария</span>
                <textarea
                  value={scenarioInfo.description}
                  onChange={(e) =>
                    setScenarioInfo((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Preview сценария</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePreviewUpload}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Тип доступа</span>
                <select
                  value={scenarioInfo.accessType}
                  onChange={(e) =>
                    setScenarioInfo((prev) => ({
                      ...prev,
                      accessType: e.target.value as AccessType,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="public">Публичный</option>
                  <option value="link">По ссылке</option>
                  <option value="draft">Черновик</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Режим сценария</span>
                <button
                  type="button"
                  onClick={() => handleToggleScoring(!scenarioInfo.hasScoring)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-2 text-sm font-medium transition",
                    scenarioInfo.hasScoring
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  )}
                >
                  <span>{scenarioInfo.hasScoring ? "Оцениваемый" : "Неоцениваемый"}</span>
                  <span
                    className={cn(
                      "relative h-6 w-11 rounded-full transition",
                      scenarioInfo.hasScoring ? "bg-white/20" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                        scenarioInfo.hasScoring ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>
              </label>
            </div>

            {scenarioInfo.previewUrl && (
              <img
                src={scenarioInfo.previewUrl}
                alt="Preview сценария"
                className="mt-4 max-h-60 w-full rounded-2xl border border-slate-200 object-cover"
              />
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsScenarioModalOpen(false)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusText("Информация о сценарии сохранена локально");
                  setIsScenarioModalOpen(false);
                }}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
