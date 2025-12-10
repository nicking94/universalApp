import { useState, useEffect } from "react";
import { db } from "@/app/database/db";
import { CustomerNotesProps, Note } from "@/app/lib/types/types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button as MuiButton,
  TextField,
  Paper,
  Divider,
  Alert,
  useTheme,
  styled,
} from "@mui/material";
import { Delete, Edit, Add, Close } from "@mui/icons-material";

const NoteCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  position: "relative",
  "&:hover .note-actions": {
    opacity: 1,
  },
}));

const NoteActions = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(1),
  right: theme.spacing(1),
  display: "flex",
  gap: theme.spacing(0.5),
  opacity: 0,
  transition: "opacity 0.2s ease-in-out",
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  width: 32,
  height: 32,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  "&:hover": {
    backgroundColor: theme.palette.grey[100],
  },
}));

const StyledButton = styled(MuiButton)(({ theme }) => ({
  textTransform: "none",
  fontWeight: 600,
  borderRadius: theme.shape.borderRadius,
  gap: theme.spacing(1),
}));

const CustomerNotes = ({
  customerId,
  customerName,
  isOpen,
  onClose,
}: CustomerNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const theme = useTheme();

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  const fetchNotes = async () => {
    try {
      if (customerId) {
        const customerNotes = await db.notes
          .where("customerId")
          .equals(customerId)
          .sortBy("createdAt");
        setNotes(customerNotes.reverse());
      } else {
        const budgetNotes = await db.budgets
          .where("customerName")
          .equals(customerName)
          .and((b) => !!b.notes)
          .toArray();

        const mappedNotes = budgetNotes.map((b) => ({
          id: Number(b.id),
          content: b.notes || "",
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          customerId: b.customerId || "",
          isBudgetNote: true,
        }));

        setNotes(mappedNotes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      if (customerId) {
        await db.notes.add({
          customerId,
          content: newNote.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setNewNote("");
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return;

    await db.notes.update(editingNote.id as number, {
      content: editingNote.content.trim(),
      updatedAt: new Date().toISOString(),
    });

    setEditingNote(null);
    fetchNotes();
  };

  const handleDeleteNote = async (id: number) => {
    await db.notes.delete(id);
    fetchNotes();
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey) &&
        !editingNote &&
        newNote.trim()
      ) {
        event.preventDefault();
        handleAddNote();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isOpen, newNote, editingNote]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: "50vh",
          maxHeight: "80vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: theme.palette.grey[50],
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" component="h2" fontWeight="600">
          Notas de {customerName}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: theme.palette.grey[600],
            "&:hover": {
              backgroundColor: theme.palette.grey[100],
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* Formulario de nueva/editar nota */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label={editingNote ? "Editar Nota" : "Nueva Nota"}
            value={editingNote ? editingNote.content : newNote}
            onChange={(e) =>
              editingNote
                ? setEditingNote({ ...editingNote, content: e.target.value })
                : setNewNote(e.target.value)
            }
            placeholder="Escribe una nueva nota"
            multiline
            rows={3}
            variant="outlined"
            fullWidth
          />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            {editingNote ? (
              <>
                <StyledButton
                  variant="contained"
                  onClick={handleUpdateNote}
                  disabled={!editingNote.content.trim()}
                >
                  Actualizar
                </StyledButton>
                <StyledButton
                  variant="outlined"
                  onClick={() => setEditingNote(null)}
                >
                  Cancelar
                </StyledButton>
              </>
            ) : (
              <StyledButton
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddNote}
                disabled={!newNote.trim()}
              >
                Agregar Nota
              </StyledButton>
            )}
          </Box>
        </Box>

        <Divider />

        {/* Lista de notas */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: "35vh",
            overflow: "auto",
          }}
        >
          {notes.length > 0 ? (
            notes.map((note) => (
              <NoteCard key={note.id} elevation={1}>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {note.content}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  {new Date(note.createdAt).toLocaleDateString("es-AR")}
                </Typography>

                <NoteActions className="note-actions">
                  <ActionButton
                    size="small"
                    onClick={() => setEditingNote(note)}
                    sx={{
                      "&:hover": {
                        backgroundColor: theme.palette.primary.light,
                        color: theme.palette.primary.main,
                      },
                    }}
                  >
                    <Edit fontSize="small" />
                  </ActionButton>
                  <ActionButton
                    size="small"
                    onClick={() => note.id && handleDeleteNote(note.id)}
                    sx={{
                      "&:hover": {
                        backgroundColor: theme.palette.error.light,
                        color: theme.palette.error.main,
                      },
                    }}
                  >
                    <Delete fontSize="small" />
                  </ActionButton>
                </NoteActions>
              </NoteCard>
            ))
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No hay notas para este cliente
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: theme.palette.grey[50] }}>
        <StyledButton
          variant="outlined"
          onClick={onClose}
          sx={{
            borderColor: theme.palette.grey[400],
            color: theme.palette.grey[700],
            "&:hover": {
              borderColor: theme.palette.grey[600],
              backgroundColor: theme.palette.grey[100],
            },
          }}
        >
          Cerrar
        </StyledButton>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerNotes;
