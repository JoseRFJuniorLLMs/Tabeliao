"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  parse,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  format?: string;
}

export interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onChange?: (range: { start: Date | null; end: Date | null }) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate?: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  minDate?: Date;
  maxDate?: Date;
  onDateClick: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  isRangeMode?: boolean;
  hoverDate?: Date | null;
  onDateHover?: (date: Date | null) => void;
}

function CalendarGrid({
  currentMonth,
  selectedDate,
  rangeStart,
  rangeEnd,
  minDate,
  maxDate,
  onDateClick,
  onMonthChange,
  isRangeMode = false,
  hoverDate,
  onDateHover,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  const isInRange = (date: Date) => {
    if (!isRangeMode) return false;
    const start = rangeStart;
    const end = rangeEnd || hoverDate;
    if (!start || !end) return false;
    const [rangeS, rangeE] = isBefore(start, end)
      ? [start, end]
      : [end, start];
    return isAfter(date, rangeS) && isBefore(date, rangeE);
  };

  const isRangeStart = (date: Date) => {
    if (!rangeStart) return false;
    return isSameDay(date, rangeStart);
  };

  const isRangeEnd = (date: Date) => {
    if (!rangeEnd) return false;
    return isSameDay(date, rangeEnd);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="flex items-center justify-center h-8 text-xs font-medium text-muted-foreground"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((d, i) => {
          const disabled = isDateDisabled(d);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const isSelected = selectedDate && isSameDay(d, selectedDate);
          const isToday = isSameDay(d, new Date());
          const inRange = isInRange(d);
          const isStart = isRangeStart(d);
          const isEnd = isRangeEnd(d);

          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !isCurrentMonth}
              onClick={() => !disabled && isCurrentMonth && onDateClick(d)}
              onMouseEnter={() =>
                isRangeMode && onDateHover && isCurrentMonth && onDateHover(d)
              }
              onMouseLeave={() =>
                isRangeMode && onDateHover && onDateHover(null)
              }
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors",
                !isCurrentMonth && "text-muted-foreground/30",
                isCurrentMonth && !disabled && !isSelected && !inRange && !isStart && !isEnd &&
                  "hover:bg-muted text-foreground",
                disabled && "cursor-not-allowed text-muted-foreground/30",
                isToday && !isSelected && "font-bold text-primary",
                isSelected && !isRangeMode &&
                  "bg-primary text-primary-foreground hover:bg-primary",
                inRange &&
                  "bg-primary/10 text-primary rounded-none",
                isStart &&
                  "bg-primary text-primary-foreground rounded-r-none",
                isEnd &&
                  "bg-primary text-primary-foreground rounded-l-none"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "dd/mm/aaaa",
      disabled = false,
      minDate,
      maxDate,
      className,
      format: dateFormat = "dd/MM/yyyy",
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [currentMonth, setCurrentMonth] = React.useState(
      value || new Date()
    );
    const [inputValue, setInputValue] = React.useState(
      value ? format(value, dateFormat) : ""
    );
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      setInputValue(value ? format(value, dateFormat) : "");
    }, [value, dateFormat]);

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, []);

    const handleDateClick = (date: Date) => {
      onChange?.(date);
      setCurrentMonth(date);
      setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, "");
      if (val.length > 8) val = val.slice(0, 8);

      // Auto-format as dd/mm/yyyy
      let formatted = val;
      if (val.length > 2) formatted = val.slice(0, 2) + "/" + val.slice(2);
      if (val.length > 4)
        formatted =
          val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4);

      setInputValue(formatted);

      if (val.length === 8) {
        try {
          const parsed = parse(formatted, "dd/MM/yyyy", new Date());
          if (!isNaN(parsed.getTime())) {
            const tooEarly = minDate && isBefore(parsed, minDate);
            const tooLate = maxDate && isAfter(parsed, maxDate);
            if (!tooEarly && !tooLate) {
              onChange?.(parsed);
              setCurrentMonth(parsed);
            }
          }
        } catch {
          // Invalid date, ignore
        }
      }
    };

    return (
      <div
        ref={containerRef}
        className={cn("relative", className)}
      >
        <div ref={ref} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            )}
            maxLength={10}
          />
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover p-3 shadow-lg">
            <CalendarGrid
              currentMonth={currentMonth}
              selectedDate={value}
              minDate={minDate}
              maxDate={maxDate}
              onDateClick={handleDateClick}
              onMonthChange={setCurrentMonth}
            />
            <div className="mt-2 flex justify-between border-t pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const today = new Date();
                  onChange?.(today);
                  setCurrentMonth(today);
                  setIsOpen(false);
                }}
                type="button"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  onChange?.(null);
                  setInputValue("");
                  setIsOpen(false);
                }}
                type="button"
              >
                Limpar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";

function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Selecione o periodo",
  disabled = false,
  minDate,
  maxDate,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(
    startDate || new Date()
  );
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleDateClick = (date: Date) => {
    if (!selectingEnd) {
      onChange?.({ start: date, end: null });
      setSelectingEnd(true);
    } else {
      const [start, end] = isBefore(date, startDate!)
        ? [date, startDate!]
        : [startDate!, date];
      onChange?.({ start, end });
      setSelectingEnd(false);
      setIsOpen(false);
    }
  };

  const displayValue = () => {
    if (startDate && endDate) {
      return `${format(startDate, "dd/MM/yyyy")} - ${format(
        endDate,
        "dd/MM/yyyy"
      )}`;
    }
    if (startDate) {
      return `${format(startDate, "dd/MM/yyyy")} - ...`;
    }
    return "";
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !startDate && "text-muted-foreground"
        )}
      >
        <span>{displayValue() || placeholder}</span>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover p-3 shadow-lg">
          <p className="mb-2 text-xs text-muted-foreground text-center">
            {selectingEnd
              ? "Selecione a data final"
              : "Selecione a data inicial"}
          </p>
          <CalendarGrid
            currentMonth={currentMonth}
            rangeStart={startDate}
            rangeEnd={endDate}
            minDate={minDate}
            maxDate={maxDate}
            onDateClick={handleDateClick}
            onMonthChange={setCurrentMonth}
            isRangeMode
            hoverDate={selectingEnd ? hoverDate : null}
            onDateHover={setHoverDate}
          />
          <div className="mt-2 flex justify-end border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                onChange?.({ start: null, end: null });
                setSelectingEnd(false);
                setIsOpen(false);
              }}
              type="button"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
DateRangePicker.displayName = "DateRangePicker";

export { DatePicker, DateRangePicker };
