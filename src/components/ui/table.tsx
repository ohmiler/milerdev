import * as React from 'react';
import { cn } from '@/lib/utils';

type TableElementProps = {
  children: React.ReactNode;
  className?: string;
};

function Table({ className, children }: TableElementProps) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)}>{children}</table>
    </div>
  );
}

function TableHeader({ className, children }: TableElementProps) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)}>{children}</thead>;
}

function TableBody({ className, children }: TableElementProps) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)}>{children}</tbody>;
}

function TableRow({ className, children }: TableElementProps) {
  return <tr data-slot="table-row" className={cn('border-b border-border transition-colors hover:bg-muted/45', className)}>{children}</tr>;
}

function TableHead({ className, children }: TableElementProps) {
  return <th data-slot="table-head" className={cn('h-10 px-3 text-left align-middle text-xs font-semibold text-muted-foreground', className)}>{children}</th>;
}

function TableCell({ className, children }: TableElementProps) {
  return <td data-slot="table-cell" className={cn('px-3 py-3 align-middle', className)}>{children}</td>;
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
