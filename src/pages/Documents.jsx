import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  FilePlus,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useDocuments } from '../context/DocumentsContext';

const FILE_ICONS = {
  PDF: FileText,
  DOCX: FileText,
  XLSX: FileSpreadsheet,
};

const STATUS_CONFIG = {
  Ready: {
    label: 'Ready',
    className: 'bg-green-500/10 text-green-600 border border-green-500/20',
    icon: CheckCircle,
  },
  Processing: {
    label: 'Processing',
    className: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    icon: Clock,
  },
  Uploading: {
    label: 'Uploading…',
    className: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
    icon: Loader2,
  },
  Error: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-600 border border-red-500/20',
    icon: AlertCircle,
  },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function SortIcon({ column, sortBy, sortDir }) {
  if (sortBy !== column)
    return <ChevronUp size={13} className="text-slate-300 opacity-0 group-hover:opacity-100" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-blue-500" />
    : <ChevronDown size={13} className="text-blue-500" />;
}

function ConfirmModal({ file, onConfirm, onCancel }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold text-base">Confirm upload</h2>
          <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <FileText size={18} className="text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-slate-800 text-sm font-medium truncate">{file.name}</p>
              <p className="text-slate-400 text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.name.split('.').pop().toUpperCase()}
              </p>
            </div>
          </div>

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                checked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 group-hover:border-blue-400'
              }`}
              onClick={() => setChecked((v) => !v)}
            >
              {checked && <CheckCircle size={10} className="text-white" />}
            </div>
            <span
              className="text-slate-600 text-sm leading-relaxed select-none"
              onClick={() => setChecked((v) => !v)}
            >
              I confirm these documents are authorized for analysis and I have the right to upload them to this platform.
            </span>
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-200 text-slate-600 hover:bg-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => checked && onConfirm()}
            disabled={!checked}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            Upload document
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ doc, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold text-base">Delete document</h2>
          <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-slate-600 text-sm leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-800">"{doc.name}"</span>? This removes it from the workspace only — it cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onCancel} className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl text-sm hover:bg-white transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const { docs, uploadDocument, deleteDocument } = useDocuments();
  const [pendingFile, setPendingFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sortBy, setSortBy] = useState('uploadedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortedDocs = [...docs].sort((a, b) => {
    let av = a[sortBy], bv = b[sortBy];
    if (sortBy === 'uploadedAt') { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const validateFile = (file) => {
    if (!file) return false;
    const ok = file.name.match(/\.(pdf|docx|xlsx)$/i);
    if (!ok) {
      alert('Only PDF, DOCX, and XLSX files are accepted.');
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('File must be under 50 MB.');
      return false;
    }
    return true;
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (validateFile(file)) setPendingFile(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const confirmUpload = async () => {
    const file = pendingFile;
    setPendingFile(null);
    setUploadError('');
    const result = await uploadDocument(file);
    if (!result.success && !result.skipped) {
      setUploadError(`Upload failed: ${result.error ?? `HTTP ${result.status}`}`);
    }
  };

  const columns = [
    { key: 'name', label: 'File name' },
    { key: 'uploadedAt', label: 'Uploaded' },
    { key: 'type', label: 'Type' },
    { key: 'size', label: 'Size' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <AppLayout title="Documents">
      <div className="max-w-5xl mx-auto space-y-5">

        {uploadError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm flex-1">{uploadError}</p>
            <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl px-6 py-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <Upload size={22} className={isDragging ? 'text-blue-500' : 'text-slate-400'} />
          </div>
          <p className="text-slate-700 font-semibold text-base mb-1">
            {isDragging ? 'Drop to upload' : 'Drop files here or click to browse'}
          </p>
          <p className="text-slate-400 text-sm">Accepts PDF, DOCX, XLSX — up to 50 MB each</p>
        </div>

        {/* Document library */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              <h3 className="text-slate-800 font-semibold text-sm">Document Library</h3>
              <span className="text-slate-400 text-xs bg-slate-100 px-2 py-0.5 rounded-full">{docs.length}</span>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <FilePlus size={26} className="text-slate-300" />
              </div>
              <h3 className="text-slate-700 font-semibold text-base mb-2">No documents yet</h3>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Upload your first document above to add it to your workspace.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Upload size={15} />
                Upload first document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="group text-left px-5 py-3 text-slate-500 font-medium text-xs cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="flex items-center gap-1.5">
                          {col.label}
                          <SortIcon column={col.key} sortBy={sortBy} sortDir={sortDir} />
                        </span>
                      </th>
                    ))}
                    <th className="px-5 py-3 text-slate-500 font-medium text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedDocs.map((doc) => {
                    const Icon = FILE_ICONS[doc.type] || FileText;
                    const s = STATUS_CONFIG[doc.status] || STATUS_CONFIG.Processing;
                    const StatusIcon = s.icon;
                    const isSpinning = doc.status === 'Uploading';
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Icon size={15} className="text-blue-400 flex-shrink-0" />
                            <span className="text-slate-800 font-medium truncate max-w-[180px] sm:max-w-xs">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(doc.uploadedAt)}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-md font-mono">{doc.type}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{doc.size}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>
                            <StatusIcon size={11} className={isSpinning ? 'animate-spin' : ''} />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setDeleteTarget(doc)}
                            disabled={doc.status === 'Uploading'}
                            className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {pendingFile && (
        <ConfirmModal
          file={pendingFile}
          onConfirm={confirmUpload}
          onCancel={() => setPendingFile(null)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onConfirm={() => { deleteDocument(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
