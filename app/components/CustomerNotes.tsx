import { useState, useEffect } from "react";
import { db } from "@/app/database/db";
import { CustomerNotesProps, Note } from "@/app/lib/types/types";
import Button from "@/app/components/Button";
import TextArea from "@/app/components/TextArea";
import Modal from "@/app/components/Modal";
import { Trash, Edit, Plus } from "lucide-react";

const CustomerNotes = ({
  customerId,
  customerName,
  isOpen,
  onClose,
}: CustomerNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Notas de ${customerName}`}
      minheight="min-h-[50vh]"
      buttons={
        <Button
          text="Cerrar"
          colorText="text-gray_b dark:text-white"
          colorTextHover="hover:dark:text-white"
          colorBg="bg-transparent dark:bg-gray_m"
          colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
          onClick={onClose}
        />
      }
    >
      <div className="space-y-4 ">
        <div className="space-y-2">
          <TextArea
            label={editingNote ? "Editar Nota" : "Nueva Nota"}
            value={editingNote ? editingNote.content : newNote}
            onChange={(value) =>
              editingNote
                ? setEditingNote({ ...editingNote, content: value })
                : setNewNote(value)
            }
            placeholder="Escribe una nueva nota"
          />
          <div className="flex justify-end">
            {editingNote ? (
              <>
                <Button
                  text="Actualizar"
                  colorText="text-white"
                  colorTextHover="text-white"
                  onClick={handleUpdateNote}
                />
                <Button
                  text="Cancelar"
                  colorText="text-gray_b dark:text-white"
                  colorTextHover="hover:dark:text-white"
                  colorBg="bg-transparent dark:bg-gray_m"
                  colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                  onClick={() => setEditingNote(null)}
                />
              </>
            ) : (
              <Button
                icon={<Plus size={16} />}
                text="Agregar Nota"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                hotkey="Enter"
              />
            )}
          </div>
        </div>

        <div className="space-y-4 max-h-[35vh] overflow-y-auto">
          {notes.length > 0 ? (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-gray_xxl rounded-lg relative group"
              >
                <p className="whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray_m mt-1">
                  {new Date(note.createdAt).toLocaleDateString("es-AR")}
                </p>
                <div className="flex absolute top-2 right-2 gap-2">
                  <Button
                    icon={<Edit size={20} />}
                    colorText="text-gray_b"
                    colorTextHover="hover:text-white"
                    colorBg="bg-transparent"
                    colorBgHover="hover:bg-blue-500"
                    px="px-1"
                    py="py-1"
                    minwidth="min-w-0"
                    onClick={() => setEditingNote(note)}
                  />
                  <Button
                    icon={<Trash size={20} />}
                    colorText="text-gray_b"
                    colorTextHover="hover:text-white"
                    colorBg="bg-transparent"
                    colorBgHover="hover:bg-red_m"
                    px="px-1"
                    py="py-1"
                    minwidth="min-w-0"
                    onClick={() => note.id && handleDeleteNote(note.id)}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray_m py-4">
              No hay notas para este cliente
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CustomerNotes;
