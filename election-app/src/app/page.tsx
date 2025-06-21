"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import io, { Socket } from "socket.io-client";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Candidate {
  id: number;
  name: string;
  image: string;
  party: string;
  description: string;
}

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    image: "",
    party: "",
    description: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    socket.current = io("http://localhost:4001");

    socket.current.on("connect", () => {
      console.log("Socket connected to server");
    });

    socket.current.on("update", (updatedCandidates: Candidate[]) => {
      console.log(`Received 'update' event from server with ${updatedCandidates.length} candidates.`);
      setCandidates(updatedCandidates);
    });
    
    fetch("http://localhost:4001/api/candidates")
        .then(res => res.json())
        .then(data => setCandidates(data));

    return () => {
      socket.current?.disconnect();
    };
  }, []);

  const startUpdates = () => {
    console.log("Emitting 'startUpdates' event to the server.");
    socket.current?.emit("startUpdates");
    setIsUpdating(true);
  };

  const stopUpdates = () => {
    console.log("Emitting 'stopUpdates' event to the server.");
    socket.current?.emit("stopUpdates");
    setIsUpdating(false);
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = "Name is required.";
    if (!form.image.trim()) newErrors.image = "Image URL is required.";
    else if (!/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(form.image)) newErrors.image = "Enter a valid image URL.";
    if (!form.party.trim()) newErrors.party = "Party is required.";
    if (!form.description.trim()) newErrors.description = "Description is required.";
    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (showPreview) setShowPreview(false);
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setShowPreview(true);
    setShowTable(true);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const candidateData = {
        name: form.name,
        image: form.image,
        party: form.party,
        description: form.description,
    };
    
    const url = isEditing ? `http://localhost:4001/api/candidates/${form.id}` : "http://localhost:4001/api/candidates";
    const method = isEditing ? "PUT" : "POST";

    fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidateData)
    });
    
    setForm({ id: "", name: "", image: "", party: "", description: "" });
    setErrors({});
    setIsEditing(false);
    setShowPreview(false);
    setShowTable(true);
    setShowAddForm(false);
  };

  const handleDelete = (id: number) => {
    fetch(`http://localhost:4001/api/candidates/${id}`, { method: 'DELETE' });
  };

  const handleEdit = (candidate: Candidate) => {
    setForm({
      id: candidate.id.toString(),
      name: candidate.name,
      image: candidate.image,
      party: candidate.party,
      description: candidate.description,
    });
    setIsEditing(true);
    setShowPreview(false);
    setShowTable(true);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setForm({ id: "", name: "", image: "", party: "", description: "" });
    setErrors({});
    setIsEditing(false);
    setShowPreview(false);
    setShowAddForm(false);
  };

  const toggleTableView = () => {
    setShowTable(!showTable);
  };

  const partyData = {
    labels: Array.from(new Set(candidates.map(c => c.party))),
    datasets: [{
      label: '# of Candidates',
      data: Array.from(new Set(candidates.map(c => c.party))).map(party => 
        candidates.filter(c => c.party === party).length
      ),
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
    }]
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">Election Candidates</h1>
      
      <div className="flex gap-4 mb-6">
        {/* Add New Candidate Button */}
        {!showAddForm && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setIsEditing(false);
              setForm({ id: "", name: "", image: "", party: "", description: "" });
              setErrors({});
              setShowPreview(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Add New Candidate
          </button>
        )}
        
        {/* Toggle Table View Button */}
        <button
          onClick={toggleTableView}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        >
          {showTable ? "Hide Candidates Table" : "Show Candidates Table"}
        </button>
        
        {/* Real-time Updates Buttons */}
        {!isUpdating ? (
          <button
            onClick={startUpdates}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Start Real-Time Updates
          </button>
        ) : (
          <button
            onClick={stopUpdates}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Stop Real-Time Updates
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="w-full max-w-2xl mb-12">
          <form onSubmit={isEditing ? handleSubmit : handlePreview} className="bg-white p-6 rounded shadow flex flex-col gap-4">
            <h2 className="text-xl font-semibold mb-2">
              {isEditing ? "Update Candidate" : "Add New Candidate"}
            </h2>
            {isEditing && (
              <div>
                <input
                  name="id"
                  value={form.id}
                  onChange={handleChange}
                  placeholder="ID"
                  className="w-full border p-2 rounded bg-gray-100"
                  readOnly
                />
              </div>
            )}
            <div>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Name"
                className="w-full border p-2 rounded"
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            <div>
              <input
                name="image"
                value={form.image}
                onChange={handleChange}
                placeholder="Image URL (jpg, png, etc.)"
                className="w-full border p-2 rounded"
              />
              {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
            </div>
            <div>
              <input
                name="party"
                value={form.party}
                onChange={handleChange}
                placeholder="Party"
                className="w-full border p-2 rounded"
              />
              {errors.party && <p className="text-red-500 text-sm">{errors.party}</p>}
            </div>
            <div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Description"
                className="w-full border p-2 rounded"
                rows={3}
              />
              {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    Preview
                  </button>
                  {showPreview && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                      Submit
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Update Candidate
                </button>
              )}
              <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
            </div>
          </form>

          {/* Preview Section */}
          {showPreview && !isEditing && (
            <div className="bg-white p-6 rounded shadow mt-4">
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <div className="flex flex-col items-center">
                <Image
                  src={form.image}
                  alt={form.name}
                  width={120}
                  height={120}
                  className="rounded-full object-cover mb-4"
                />
                <h4 className="text-lg font-bold mb-1">{form.name}</h4>
                <p className="text-blue-700 font-semibold mb-1">{form.party}</p>
                <p className="text-gray-700 text-center">{form.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Party Chart */}
      <div className="w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Party Distribution</h2>
        <div className="bg-white rounded shadow p-4">
          <Bar data={partyData} />
        </div>
      </div>
      
      {/* Table View */}
      {showTable && (
        <div className="w-full max-w-6xl mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Candidates Table</h2>
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Image</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Party</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate, index) => (
                  <tr key={candidate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-semibold">{candidate.id}</td>
                    <td className="px-4 py-3">
                      <Image
                        src={candidate.image}
                        alt={candidate.name}
                        width={50}
                        height={50}
                        className="rounded-full object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">{candidate.name}</td>
                    <td className="px-4 py-3 text-blue-700">{candidate.party}</td>
                    <td className="px-4 py-3 max-w-xs">{candidate.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(candidate)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(candidate.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card View */}
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="bg-white rounded shadow p-4 flex flex-col items-center">
            <Image
              src={candidate.image}
              alt={candidate.name}
              width={120}
              height={120}
              className="rounded-full object-cover mb-4"
            />
            <h3 className="text-lg font-bold mb-1">{candidate.name}</h3>
            <p className="text-blue-700 font-semibold mb-1">{candidate.party}</p>
            <p className="text-gray-700 text-center mb-4">{candidate.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(candidate)}
                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(candidate.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
